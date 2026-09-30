// ทดสอบ data/seed-kv.mjs — สคริปต์ที่ส่งเกมตัวอย่างไปยัง Redis (โหมดของ Vercel)
//
// ทำไมต้องมีไฟล์นี้
// - สคริปต์ seed เดิมเขียนลง data/db.json ซึ่งบน Vercel เขียนไม่ได้ (read-only)
//   เกมตัวอย่างจึงไม่เคยไปถึงเซิร์ฟเวอร์จริง และไม่มีใครรู้จนกว่าจะ deploy
// - ใช้ mock Upstash REST (ดู scripts/mock-upstash.mjs) จึงทดสอบได้ในเครื่องและใน CI
//
// รัน: npm test  (ได้อยู่ในนี้อยู่แล้ว)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { startMockUpstash } from './mock-upstash.mjs';

const KEY = 'cq:test:seed';
const ROOT = process.cwd();

let mock;

/**
 * รัน seed-kv.mjs เป็นโปรแซสแยก พร้อมชี้ env ไปที่ mock
 *
 * ⚠️ ต้องใช้ spawn แบบ async ไม่ใช่ spawnSync
 * mock อยู่ในโปรแซสนี้ ถ้าใช้ spawnSync จะบล็อก event loop ที่ต้อง serve mock
 * ลูกจะรอคำตอบที่ไม่มีใครส่งให้ = ค้างตลอดกาย (เจอจริงตอนเขียนเทสต์นี้ครั้งแรก)
 */
function runSeeder(env = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(ROOT, 'data', 'seed-kv.mjs')], {
      cwd: ROOT,
      env: {
        ...process.env,
        KV_REST_API_URL: mock.url,
        KV_REST_API_TOKEN: 'test-token',
        KV_DB_KEY: KEY,
        ...env,
      },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (c) => (stdout += c));
    child.stderr.on('data', (c) => (stderr += c));
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

before(async () => {
  mock = await startMockUpstash();
});

after(async () => {
  await mock.close();
});

test('Redis ว่าง: เติมจาก db.default.json แล้วได้เกมตัวอย่างครบ', async () => {
  const res = await runSeeder();
  assert.equal(res.status, 0, `seed-kv.mjs ล้มเหลว\n${res.stdout}\n${res.stderr}`);

  const db = JSON.parse(mock.peek(KEY));
  const ids = db.games.map((g) => g.id);

  // demo-game-1 มาจาก db.default.json ส่วนที่เหลือมาจากสคริปต์ seed
  assert.deepEqual(
    ids.sort(),
    ['demo-game-1', 'seed-game-2', 'seed-game-3', 'seed-game-4'],
    'ต้องได้เกมตั้งต้น + เกมตัวอย่าง 3 เกม'
  );
  assert.equal(db.missions.length, 15, 'ต้องได้ 15 ด่าน');
});

test('รันซ้ำต้องไม่สร้างข้อมูลซ้ำ', async () => {
  const res = await runSeeder();
  assert.equal(res.status, 0, `seed-kv.mjs ล้มเหลว\n${res.stdout}\n${res.stderr}`);

  const db = JSON.parse(mock.peek(KEY));
  assert.equal(db.games.length, 4, 'ต้องยังเป็น 4 เกม');
  assert.equal(db.missions.length, 15, 'ต้องยังเป็น 15 ด่าน');
  assert.match(res.stdout, /เพิ่ม 0 เกม \/ 0 ด่าน/, 'ต้องรายงานว่าไม่มีอะไรเพิ่ม');
});

test('เกมที่มีอยู่แล้วต้องไม่หายไปตอนเติมข้อมูล', async () => {
  // จำลองครูสร้างเกมของตัวเองใน Redis ก่อน แล้วค่อย seed
  const current = JSON.parse(mock.peek(KEY));
  current.games.push({
    id: 'teacher-made-game',
    name: 'เกมที่ครูสร้างเอง',
    mode: 'solo',
    roomCode: 'MINE1',
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  mock.forceSet(KEY, JSON.stringify(current));

  const res = await runSeeder();
  assert.equal(res.status, 0, `seed-kv.mjs ล้มเหลว\n${res.stdout}\n${res.stderr}`);

  const db = JSON.parse(mock.peek(KEY));
  assert.ok(
    db.games.some((g) => g.id === 'teacher-made-game'),
    'เกมที่ครูสร้างไว้ต้องไม่หาย (สคริปต์ seed ต้องเติมเพิ่ม ไม่ใช่เขียนทับ)'
  );
  assert.equal(db.games.length, 5, 'ต้องมี 5 เกม (4 เดิม + 1 ของครู)');
});

test('ไม่ตั้ง env ต้องบอกชัดว่าใช้ทำอะไร และไม่เขียนอะไรทิ้ง', async () => {
  // ตั้งเป็นค่าว่างเพื่อจำลอง "ยังไม่ได้ตั้ง" ในเครื่องที่รันแบบไฟล์
  const res = await runSeeder({ KV_REST_API_URL: '', KV_REST_API_TOKEN: '' });
  assert.notEqual(res.status, 0, 'ควรจบด้วยรหัสไม่ปกติ');
  assert.match(res.stderr, /KV_REST_API_URL/, 'ต้องบอกชื่อ env ที่ขาด');
  assert.match(res.stderr, /npm run seed/, 'ต้องบอกทางเลือกสำหรับเครื่องตัวเอง');
});
