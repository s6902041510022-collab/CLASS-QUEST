// รันเทสต์ที่ต้องมี API จริง — เปิด dev server เอง แล้วปิดให้อัตโนมัติ
//   npm run test:e2e
//
// ทำไมต้องมีไฟล์นี้ แทนที่จะสั่ง "เปิด dev server แล้วค่อยรันเทสต์" ในคำสั่งเดียว
//   เพราะการสั่งด้วยคนเสมอทำให้เกิด 2 อย่างที่ไม่เคยเจอในเวลาที่สะดวก:
//     1) ลืมเปิด server → เทสต์พังทั้งชุดด้วย ECONNREFUSED ซึ่งดูเหมือนโค้ดพัง
//      (แต่จริงๆ แค่ยังไม่ได้รอ) — เสียเวลาแก้ที่ผิดที่
//   2) เทสต์เขียนลง data/db.json ของจริง แล้วลืมกู้ → ข้อมูลเกมจริงของครูหาย
//   ตัวนี้แก้ทั้งสองอย่าง: รอให้พร้อมจริง และกู้ไฟล์ข้อมูลทุกครั้งแม้พังด้วย
//
// ⚠️ เทสต์ E2E สมัครบัญชีครูจริง (ชื่อสุ่ม) ทุกครั้งที่รัน
//    แต่เพราะกู้ data/db.json กลับทุกครั้ง บัญชีพวกนั้นจึงหายไปพร้อมกัน ไม่ตกค้าง
//    (ถ้าวันหนึ่งรันเทสต์โดยไม่มี dev server เอง บัญชีจะค้างในฐานข้อมูลจริง
//     เพราะฉะนั้นอย่าลืมลบ data/db.json ทิ้งถ้าล้มเหลวกลางคัน)

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, copyFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DATA_FILE = path.join(ROOT, 'data', 'db.json');
const BACKUP = path.join(ROOT, 'data', 'db.json.e2e-backup');
const PORT = process.env.CQ_PORT || '3000';
const BASE = `http://localhost:${PORT}`;
const READY_TIMEOUT_MS = 120_000;

const FILES = [
  'scripts/e2e-choice.test.mjs',
  'scripts/e2e-tasks.test.mjs',
  'scripts/api-isolation.test.mjs',
  'scripts/api-student-flow.test.mjs',
];

const hasBackup = existsSync(BACKUP);

if (hasBackup) {
  // รอบก่อนตายกลางคัน (เครื่องดับ / ปิดหน้าต่าง) — คืนของเดิมก่อนจะทับอีกที
  copyFileSync(BACKUP, DATA_FILE);
  rmSync(BACKUP, { force: true });
  console.log('กู้ data/db.json จากไฟล์สำรองของรอบที่ค้างอยู่ก่อน\n');
}

const hadDataFile = existsSync(DATA_FILE);
if (hadDataFile) copyFileSync(DATA_FILE, BACKUP);

let server = null;
let restored = false;

function restore() {
  if (restored) return;
  restored = true;
  if (server) {
    server.kill();
    server = null;
  }
  if (hadDataFile) copyFileSync(BACKUP, DATA_FILE);
  else rmSync(DATA_FILE, { force: true });
  rmSync(BACKUP, { force: true });
  console.log('\nกู้ data/db.json กลับเรียบร้อย');
}

// ถ้า process ถูกปิดกลางคัน (Ctrl+C) ก็ต้องกู้ ไม่งั้นข้อมูลครูหายเงียบ ๆ
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => {
    restore();
    process.exit(130);
  });
}
process.on('exit', restore);

async function waitForServer() {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  let lastError = '';
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) {
        const body = await res.json();
        if (body?.ok) return body;
        lastError = `health ตอบ ok=${body?.ok}`;
      } else {
        lastError = `health ตอบ ${res.status}`;
      }
    } catch (err) {
      lastError = err.message;
    }
    // dev server คอมไพล์ครั้งแรกนานมาก ไม่มีอะไรให้พิมพ์ระหว่างรอ
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `dev server ไม่ตอบภายใน ${READY_TIMEOUT_MS / 1000} วินาที (${lastError})\n` +
      ' ถ้าพอร์ตถูกใช้อยู่ ให้ปิดโปรแกรมที่ใช้พอร์ตนั้นก่อน'
  );
}

try {
  console.log(`เปิด dev server ที่ ${BASE} ...`);
  server = spawn(
    process.execPath,
    [path.join('node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '-p', PORT],
    { stdio: 'ignore', env: { ...process.env } }
  );

  const health = await waitForServer();
  console.log(`พร้อมแล้ว — store = ${health.store}\n`);

  // ⚠️ --test-concurrency=1 สำคัญมาก ไม่ใช่แค่เรื่องความเร็ว
  //   `node --test` ปกติจะรันหลายไฟล์พร้อมกัน (เท่าจำนวน CPU)
  //   ทั้งสามไฟล์นี้ยิง dev server ตัวเดียวกันและแชร์ฐานข้อมูลตัวเดียวกัน
  //   ถ้ารันพร้อมกัน เทสต์จะเห็นข้อมูลของกันและพังแบบไม่มีเหตุผล
  //   (เจอแล้วตอนรันครั้งแรก — ไฟล์ e2e สมัครบัญชีพร้อมกันแล้วเซสชันหายไปหนึ่ง)
  const r = spawnSync(
    process.execPath,
    [
      '--import', './scripts/register-ts.mjs',
      '--test',
      '--test-concurrency=1',
      '--test-reporter=tap',
      ...FILES,
    ],
    { stdio: 'inherit' }
  );
  process.exitCode = r.status || 0;
  if (r.status === 0) console.log('\n✅ เทสต์ E2E ผ่านทั้งหมด');
} catch (err) {
  console.error('\n❌ ' + err.message);
  process.exitCode = 1;
} finally {
  restore();
}
