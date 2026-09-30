// ทดสอบว่าระบบเลือกที่เก็บข้อมูลตัวไหน เมื่อตั้ง env ไว้มากกว่าชุด
//
// ทำไมต้องมีไฟล์นี้
// - ตอนมีทั้ง Redis และ Firestore พร้อมกัน ระบบต้องเลือกตามลำดับที่ตกลงกัน
//   ไม่งั้นตั้งครบทั้งสองชุดแล้วจะไม่รู้ว่ากำลังใช้อันไหน
//   และถ้าตั้งผิดลำดับ ข้อมูลที่อยู่ในอีกที่จะ "หายไปจากหน้าจอ" โดยไม่มีใครสังเกต
// - ลำดับที่ตกลง: Redis > Firestore > ไฟล์ (Redis ตั้งค่าน้อยกว่ามากใน Vercel)
//
// ⚠️ ต้องอยู่คนละไฟล์กับ db-kv.test.mjs เพราะ db.ts อ่าน env ตอนโหลดโมดูล
//    และ node --test รันแต่ละไฟล์แยก process กันอยู่แล้ว
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { startMockUpstash } from './mock-upstash.mjs';

let mock;
let db;

before(async () => {
  mock = await startMockUpstash();

  // ตั้ง Redis
  process.env.KV_REST_API_URL = mock.url;
  process.env.KV_REST_API_TOKEN = 'test-token';
  process.env.KV_DB_KEY = 'cq:test:precedence';

  // ตั้ง Firestore พร้อมกัน (ไม่ต้องต่อเน็ต — แค่มี env ก็ถือว่า config แล้ว)
  process.env.FIREBASE_PROJECT_ID = 'test-project';
  process.env.FIREBASE_CLIENT_EMAIL = 'test@test-project.iam.gserviceaccount.com';
  process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nfake\\n-----END PRIVATE KEY-----\\n';

  db = await import('../src/lib/db.ts');
});

// ⚠️ ต้องปิด mock server ไม่งั้น process จะไม่จบ (เคยเจอ: เทสต์ผ่านหมดแต่ค้างไม่ออก)
after(async () => {
  await mock.close();
});

test('ตั้งทั้ง Redis และ Firestore แล้วต้องเลือก Redis', () => {
  // ทั้งสองชุดต้องถูกมองเห็น (ไม่ใช่การซ่อนข้อมูลผิด)
  assert.equal(db.usingKv, true, 'ควรตรวจจับ Redis ได้');
  assert.equal(db.usingFirestore, true, 'ควรตรวจจับ Firestore ได้');

  // แต่ตัวที่ถูกใช้งานต้องเป็น Redis
  assert.match(
    db.storeLabel,
    /^Redis/,
    `ต้องใช้ Redis เมื่อตั้งทั้งสองชุด แต่ได้ "${db.storeLabel}" — ` +
      `ถ้าได้ Firestore แปลว่าข้อมูลใน Redis จะหายจากหน้าจอเงียบ ๆ`
  );
});

test('ข้อมูลที่อ่านได้ต้องมาจาก Redis ไม่ใช่ Firestore', async () => {
  // ลงข้อมูลแยกอันละชื่อใน Redis แล้วยืนยันว่าระบบอ่านจากตรงนี้จริง
  mock.forceSet('cq:test:precedence', JSON.stringify({
    games: [{ id: 'from-redis', name: 'มาจาก Redis' }],
    missions: [], students: [], players: [], sessions: [], teams: [], groups: [],
  }));

  const store = await db.getDb();
  assert.equal(store.data.games[0].id, 'from-redis', 'ต้องอ่านข้อมูลจาก Redis');
});

test('ถอด env ของ Redis ออก แล้วเป็น Firestore โดยไม่ต้องแก้โค้ด', async () => {
  // ข้อสัญญาของลำดับ Redis > Firestore: การสลับไปใช้ Firestore ทำได้
  // ด้วยการถอด KV_* ออกอย่างเดียว ไม่ต้องแก้โค้ด
  //
  // ต้องรันโปรเซสแยก เพราะ db.ts เลือก backend ตอนโหลดโมดูล (อ่าน env ครั้งเดียว)
  // ขั้นนี้ไม่ต้องต่อเน็ต เพราะ storeLabel คำนวณจาก env ล้วน ๆ
  // ⚠️ ต้องใช้ absolute file URL ไม่ใช่ path แบบ relative
  // เพราะ --eval ให้ฐานที่อยู่กับโฟลเดอร์แม่ของ cwd (เจอตอนเขียนครั้งแรก)
  const dbUrl = pathToFileURL(path.join(process.cwd(), 'src', 'lib', 'db.ts')).href;
  const script = `
    process.env.KV_REST_API_URL = '';
    process.env.KV_REST_API_TOKEN = '';
    const db = await import(${JSON.stringify(dbUrl)});
    console.log(JSON.stringify({
      usingKv: db.usingKv,
      usingFirestore: db.usingFirestore,
      storeLabel: db.storeLabel,
    }));
  `;

  const out = execFileSync(process.execPath, ['--import', './scripts/register-ts.mjs', '--input-type=module', '--eval', script], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      KV_REST_API_URL: '',
      KV_REST_API_TOKEN: '',
    },
  });

  const child = JSON.parse(out.trim().split('\n').pop());
  assert.equal(child.usingKv, false, 'ควรไม่เห็น Redis เมื่อถอด env ออก');
  assert.equal(child.usingFirestore, true, 'ควรเห็น Firestore');
  assert.match(child.storeLabel, /^Firebase Firestore/, `ควรใช้ Firestore แต่ได้ "${child.storeLabel}"`);
});