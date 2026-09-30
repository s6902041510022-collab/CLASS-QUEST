// ทดสอบฝั่ง Redis (kvBackend) — โหมดที่ต้องใช้ตอน deploy บน Vercel
//
// ทำไมต้องมีไฟล์นี้
// - ฝั่ง Redis เดิมไม่เคยมีเทสต์มาแตะเลย เพราะต้องมี Redis ของจริง
//   ผลคือบั๊กในโค้ด Redis จะไม่มีวันโผล่จนกว่าจะ deploy แล้วล็อกอินไม่ได้
// - ใช้ mock ที่เลียนแบบ Upstash REST (ดู scripts/mock-upstash.mjs)
//   ทำให้ทดสอบฝั่งนี้ได้ในเครื่อง และใน CI โดยไม่ต้องต่อของจริง
//
// ⚠️ ไฟล์นี้ import '../src/lib/db.ts' ตรง ๆ ต้องใช้ Node ที่ strip
//    TypeScript ได้เอง (Node 24) ดู engines ใน package.json
//
// รัน: node --test scripts/db-kv.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startMockUpstash } from './mock-upstash.mjs';

const KEY = 'cq:test:db';

let mock;
let db;
/** ผลของการโหลดครั้งแรก — ต้องเก็บไว้ก่อนมีการเขียนใด ๆ */
let firstLoad;

before(async () => {
  mock = await startMockUpstash();
  // ต้องตั้ง env ก่อน import เพราะ db.ts อ่านค่านี้ตอนโหลดโมดูล
  process.env.KV_REST_API_URL = mock.url;
  process.env.KV_REST_API_TOKEN = 'test-token';
  process.env.KV_DB_KEY = KEY;

  db = await import('../src/lib/db.ts');

  // โหลดครั้งแรก (ยังไม่เคยเขียนอะไร)
  firstLoad = await db.getDb();
});

after(async () => {
  await mock.close();
});

test('ตั้ง env ครบแล้วเลือกใช้ Redis', () => {
  assert.equal(db.usingKv, true, 'ควรใช้ Redis เมื่อมี KV_REST_API_URL + KV_REST_API_TOKEN');
  assert.match(db.storeLabel, /Redis/, `ควรบอกว่าใช้ Redis แต่ได้ "${db.storeLabel}"`);
});

test('โหมด Redis ไม่ต้องเขียนดิสก์ (ต่างจากโหมดไฟล์ที่พังบน Vercel)', async () => {
  const perm = await db.storeWritable();
  assert.equal(perm.writable, true, 'โหมด Redis ต้องไม่ต้องพึ่งดิสก์');
});

test('ครั้งแรกอ่านค่าตั้งต้นจาก data/db.default.json แล้วยังไม่เขียนลง Redis', () => {
  // เกมตั้งต้นมี 1 เกม (demo-game-1) — ที่มาคือไฟล์ในรีโป ไม่ใช่ Redis
  assert.equal(firstLoad.data.games.length, 1);
  assert.equal(firstLoad.data.games[0].id, 'demo-game-1');
  assert.equal(
    mock.peek(KEY),
    null,
    'การอ่านครั้งแรกต้องไม่เขียนอะไรลง Redis (เขียนตอน read คือบั๊ก)'
  );
});

test('เขียนแล้วอ่านกลับได้จริงใน Redis', async () => {
  const game = await db.createGame({
    name: 'เกมทดสอบ Redis',
    status: 'draft',
    mode: 'solo',
    timeLimit: 60,
    playerLimit: 40,
  });
  assert.ok(game?.id, 'ต้องได้ id เกมกลับมา');

  // ข้อมูลต้องอยู่ใน Redis จริง ไม่ใช่แค่ในหน่วยความจำ
  // (createGame สร้าง roomCode ให้เอง เลยอ้างค่าที่ได้คืนมาแทนที่จะกำหนดเอง)
  const raw = mock.peek(KEY);
  assert.ok(raw, 'ต้องมีข้อมูลถูกเขียนลง Redis');
  assert.ok(raw.includes(game.id), 'ข้อมูลใน Redis ต้องมีเกมที่เพิ่งสร้าง');

  const games = await db.getAllGames();
  assert.ok(games.some((g) => g.id === game.id), 'อ่านกลับต้องเจอเกมใหม่');
});

test('PIN เริ่มต้น 1234 ใช้ได้ (สิ่งที่ครูต้องล็อกอินด้วย)', async () => {
  assert.equal(await db.verifyPin('1234'), true);
  assert.equal(await db.verifyPin('9999'), false);
  assert.equal(await db.verifyPin(''), false);
});

test('บันทึกชื่อครูได้ (ขั้นตอนถัดจากการตรวจ PIN)', async () => {
  const teacher = await db.saveTeacher({ name: 'คุณครูทดสอบ', avatar: '🦊' });
  assert.equal(teacher.name, 'คุณครูทดสอบ');

  const current = await db.getTeacher();
  assert.equal(current.name, 'คุณครูทดสอบ', 'ต้องอ่านชื่อครูที่บันทึกไว้กลับได้');
});

test('ใช้ล็อกแบบกระจายตอนเขียน (SET ... NX ... PX)', () => {
  // withLock ใช้ SET NX PX — ถ้าหายไป แปลว่าไม่ได้ล็อก แล้วเขียนชนกันได้
  const locking = mock.calls.filter(
    (c) => c[0] === 'SET' && c.includes('NX') && c.includes('PX')
  );
  assert.ok(locking.length > 0, 'ไม่พบคำสั่งล็อกเลย — withLock อาจไม่ถูกเรียก');
});

test('เขียนพร้อมกันสองทาง ข้อมูลต้องไม่หาย', async () => {
  const before2 = (await db.getAllGames()).length;

  // สองคนกดสร้างเกมพร้อมกัน — mergeValue ต้องรวมงานทั้งสองคนไว้
  const [a, b] = await Promise.all([
    db.createGame({ name: 'พร้อมกัน A', roomCode: 'PARA', status: 'draft', mode: 'solo' }),
    db.createGame({ name: 'พร้อมกัน B', roomCode: 'PARB', status: 'draft', mode: 'solo' }),
  ]);

  const after2 = await db.getAllGames();
  assert.ok(after2.some((g) => g.id === a.id), 'เกม A หายไป');
  assert.ok(after2.some((g) => g.id === b.id), 'เกม B หายไป');
  assert.equal(after2.length, before2 + 2, 'ต้องเพิ่มขึ้น 2 เกม');
});
