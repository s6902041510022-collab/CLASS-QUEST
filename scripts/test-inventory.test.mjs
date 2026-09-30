// เทสต์ทุกตัวต้องถูกสั่งรัน — ไม่มีเทสต์ที่ "เขียนไว้แต่ไม่เคยทำงาน"
//
// ปัญหาที่เคยเจอ
// `npm test` เดิมใช้ `--test` เฉย ๆ ซึ่ง Node จะหาไฟล์ *.test.mjs ทั้งโฟลเดอร์
// ฟังดูดี — แต่มันหมายความว่า: เพิ่มเทสต์ใหม่แล้วมันจะถูกรัน "โดยบังเอิญ"
// และเทสต์ E2E (ต้องมี dev server) ปนมากับชุดที่รันได้โดยไม่ต้องมีอะไร
// ผลคือทั้งชุดพังพร้อมกันถ้าไม่ได้เปิด server → เลยไม่มีใครรันมันเลยสักที
// เทสต์ที่ไม่เคยทำงาน ให้ความรู้สึกปลอดภัยปลอม แย่กว่าไม่มีเทสต์เลย
//
// วิธีกัน: เทสต์นี้เทียบรายชื่อไฟล์ *.test.mjs ใน scripts/ กับที่ประกาศไว้จริง
// เพิ่มไฟล์ใหม่โดยไม่ลงทะเบียน → เทสต์นี้แดงทันที

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPTS = path.join(ROOT, 'scripts');

const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const e2eRunner = readFileSync(path.join(SCRIPTS, 'e2e.mjs'), 'utf8');

/**
 * ชื่อไฟล์ .mjs ที่คำสั่งนั้นระบุไว้
 *
 * ตัดที่ --test ออกก่อน เพราะก่อนหน้านั้นเป็นตัวเลือกของ node เช่น
 * `--import ./scripts/register-ts.mjs` — ซึ่งชี้ไปยังสคริปต์ที่ไม่ใช่เทสต์
 * (register-ts.mjs คือตัวช่วย strip TypeScript) ไม่งั้นจะเข้าใจผิดว่ารันมันด้วย
 *
 * ⚠️ ต้องแยกด้วย --test ที่ตามด้วยช่องว่าง ไม่ใช่แค่ขึ้นต้นด้วย --test
 *    เพราะ --test-reporter ขึ้นต้นด้วย --test เหมือนกัน
 *    ถ้าใช้ split('--test') จะได้ค่าผิด แล้วเทสต์นี้จะรายงานว่า
 *    "ไม่มีเทสต์ถูกสั่งรันเลย" ทั้งที่รันครบ — ซึ่งทำให้คนหยุดอ่านมัน
 */
function scriptsIn(command) {
  const m = command.match(/--test(?:\s+|$)([\s\S]*)$/);
  const args = m ? m[1] : command;
  return [...args.matchAll(/scripts[/\\]([\w.-]+\.mjs)/g)].map((x) => x[1]);
}

/** ไฟล์ที่ e2e.mjs สั่งรันจริง (อ่านจากตัวแปร FILES) */
function e2eListed() {
  const block = (e2eRunner.match(/const FILES = \[([\s\S]*?)\];/) || [, ''])[1];
  return [...block.matchAll(/'([^']+\.test\.mjs)'/g)].map((m) => m[1].replace(/^scripts[/\\]/, ''));
}

const unitListed = scriptsIn(pkg.scripts['test:unit'] || '');
const e2eListedFiles = e2eListed();

/** ไฟล์เทสต์ที่ต้องมี dev server จึงจะรันได้ — แยกออกจากชุด unit */
const NEEDS_SERVER = new Set(['api-isolation', 'e2e-choice', 'e2e-tasks']);

/** ตัวช่วยที่อยู่ใน scripts/ แต่ไม่ใช่เทสต์ — ห้ามถูกสั่งรันเป็นเทสต์ */
const NOT_TESTS = new Set([
  'http-client.mjs',
  'mock-upstash.mjs',
  'register-ts.mjs',
  'ts-hooks.mjs',
]);

const files = readdirSync(SCRIPTS)
  .filter((f) => f.endsWith('.test.mjs'))
  .sort();

const base = (f) => f.replace(/\.test\.mjs$/, '');

test('มีไฟล์เทสต์อยู่จริง (กันกรณี glob พลาดแล้วเทสต์นี้ผ่านเปล่า ๆ)', () => {
  assert.ok(
    files.length >= 8,
    `เจอแค่ ${files.length} ไฟล์ — ถ้าน้อยผิดปกติ แปลว่าอ่านโฟลเดอร์ผิดที่ และเทสต์ข้างล่างจะผ่านทั้งที่ไม่ได้ตรวจอะไร`
  );
});

test('ทุกไฟล์ *.test.mjs ต้องถูกสั่งรัน (unit หรือ e2e อย่างใดอย่างหนึ่ง)', () => {
  const listed = new Set([...unitListed, ...e2eListedFiles]);
  const missing = files.filter((f) => !listed.has(f));

  assert.deepEqual(
    missing,
    [],
    `เทสต์เหล่านี้ไม่ถูกสั่งรันที่ไหนเลย:\n  - ${missing.join('\n  - ')}\n` +
      'เพิ่มลง scripts."test:unit" ใน package.json (หรือ FILES ใน scripts/e2e.mjs)\n' +
      'เทสต์ที่ไม่ถูกสั่งรัน = โค้ดที่ดูเหมือนมีการตรวจ แต่ไม่เคยถูกตรวจ'
  );
});

test('ไฟล์ที่ต้องมี dev server ต้องอยู่ฝั่ง e2e ไม่ใช่ฝั่ง unit', () => {
  const misplaced = unitListed.filter((f) => NEEDS_SERVER.has(base(f)));
  assert.deepEqual(
    misplaced,
    [],
    `ไฟล์เหล่านี้ต้องมี dev server แต่ถูกใส่ใน test:unit:\n  - ${misplaced.join('\n  - ')}\n` +
      'จะพังทั้งชุดด้วย ECONNREFUSED เมื่อไม่มี server\n' +
      'และทำให้ชุด unit ที่ควรรันได้ทุกที่กลับดูไม่น่าเชื่อถือ'
  );

  const missingE2e = [...NEEDS_SERVER]
    .map((n) => `${n}.test.mjs`)
    .filter((f) => !e2eListedFiles.includes(f));
  assert.deepEqual(missingE2e, [], `e2e.mjs ไม่ได้รัน: ${missingE2e.join(', ')}`);
});

test('ชื่อไฟล์ที่ประกาศไว้ต้องมีจริง (กันพิมพ์ผิดชื่อแล้วเงียบ)', () => {
  const missing = unitListed.filter((f) => !files.includes(f) && !NOT_TESTS.has(f));
  assert.deepEqual(
    missing,
    [],
    `ใน test:unit มีไฟล์ที่ไม่มีจริง: ${missing.join(', ')} — Node จะรันเฉพาะที่หาเจอ\n` +
      'ทำให้เทสต์หายไปเงียบ ๆ โดยไม่มีอะไรฟ้อง'
  );
});

test('ตัวช่วยที่ไม่ใช่เทสต์ ต้องไม่ถูกสั่งรันเป็นเทสต์', () => {
  const wrong = unitListed.filter((f) => NOT_TESTS.has(f));
  assert.deepEqual(
    wrong,
    [],
    `test:unit ไปรันตัวช่วยเป็นเทสต์: ${wrong.join(', ')} — มันไม่มี test() เลย จะรายงานว่าไม่มีเทสต์`
  );
});

test('npm test ต้องรันทั้ง unit และ e2e โดยไม่ต้องพึ่งคนเปิด server เอง', () => {
  assert.match(pkg.scripts.test, /test:unit/, 'npm test ต้องรวม test:unit');
  assert.match(pkg.scripts.test, /test:e2e/, 'npm test ต้องรวม test:e2e');
  assert.ok(
    (pkg.scripts['test:e2e'] || '').includes('scripts/e2e.mjs'),
    'test:e2e ต้องเรียกตัวที่เปิด dev server เอง'
  );
});

test('ตัวรัน e2e ต้องกู้ data/db.json เสมอ (ไม่งั้นเกมจริงของครูหายตอนรันเทสต์)', () => {
  // เทสต์ E2E เขียนลงฐานข้อมูลจริงของเครื่องนี้
  // ถ้าไม่สำรอง/กู้ เกมที่ครูทำไว้จะหายทุกครั้งที่รันเทสต์ โดยไม่มีใครสังเกต
  assert.match(e2eRunner, /copyFileSync\([^)]*BACKUP/, 'ต้องสำรองก่อนรัน');
  assert.match(e2eRunner, /copyFileSync\(BACKUP,\s*DATA_FILE\)/, 'ต้องกู้คืนหลังรัน');

  // ต้องจัดการสัญญาณหยุดกลางคันด้วย
  // (Ctrl+C ระหว่างรันเทสต์เป็นเรื่องปกติมาก ไม่ใช่กรณีพิเศษ
  //  และถ้าไม่กู้ ข้อมูลเกมจริงของครูบนเครื่องนี้จะหายเงียบ ๆ)
  assert.ok(
    e2eRunner.includes('SIGINT') && e2eRunner.includes('SIGTERM'),
    'ต้องรับสัญญาณ Ctrl+C / kill แล้วกู้ข้อมูล'
  );
  assert.ok(
    /process\.on\(['"]exit['"],\s*restore\)/.test(e2eRunner),
    'ต้องกู้ข้อมูลเมื่อจบ process แบบปกติด้วย ไม่ใช่เฉพาะทางแสดงข้อผิดพลาด'
  );
});
