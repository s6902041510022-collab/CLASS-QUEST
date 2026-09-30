// กันไม่ให้ PIN ครูหลุดไปอยู่ในโค้ดที่ส่งไปให้เบราว์เซอร์
//
// ทำไมต้องมีไฟล์นี้
// ตอนที่แอปยังเป็นเดโม หน้าล็อกอินเขียน "PIN: 1234" ทิ้งไว้กลางหน้าเพื่อให้ทดสอบง่าย
// พอเอาไปให้นักเรียนใช้ กลายเป็นการประกาศรหัสผ่านให้ทุกคนที่เปิดเว็บได้
// ซึ่งไม่ใช่แค่ของเผยแพร่ แต่ยังทำให้เข้าใจผิดว่าเปลี่ยน PIN ไม่ได้
// เพราะหน้าเว็บยังบอก 1234 อยู่ ทั้งที่จริงๆ ครูเปลี่ยนไปแล้ว
//
// การเขียนแบบนี้มักไม่ได้ระวังตัว เพราะ "ดูสะดวกตอนทดสอบ" แล้วลืมว่ามันคือโค้ดจริง
// เทสต์นี้ทำหน้าที่กันไม่ให้กลับมาอีก โดยไม่ต้องไปจำว่าห้ามเขียนตรงไหน
//
// ⚠️ ยกเว้น src/lib/db.ts — ที่นี่เก็บค่าเริ่มต้นตอนติดตั้งครั้งแรก ซึ่งถูกต้อง
//    (ถ้าไม่มี ครูคนแรกจะเข้าไม่ได้เลย) แต่ต้องอยู่ฝั่งเซิร์ฟเวอร์เท่านั้น
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** ไฟล์ .tsx ใต้ src/app คือโค้ดที่ถูกส่งไปให้เบราว์เซอร์ (หน้าเว็บ + component) */
function clientFiles(dir = path.join(ROOT, 'src', 'app')) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) found.push(...clientFiles(full));
    else if (full.endsWith('.tsx')) found.push(full);
  }
  return found;
}

test('หน้าเว็บต้องไม่มี PIN เริ่มต้น (1234) ปรากฏที่ไหนเลย', () => {
  const offenders = [];
  for (const file of clientFiles()) {
    const src = readFileSync(file, 'utf8');
    // จับเฉพาะเลข 1234 ที่ยืนลำพัง ไม่ใช่ส่วนหนึ่งของเลขยาวกว่า
    // เช่น room code 123456 หรือ index 12345 ไม่เกี่ยวกับเรื่องนี้
    if (/(?<!\d)1234(?!\d)/.test(src)) {
      offenders.push(path.relative(ROOT, file));
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `พบ PIN เริ่มต้นในโค้ดที่ส่งไปให้เบราว์เซอร์: ${offenders.join(', ')}\n` +
      `ทุกคนที่เปิดเว็บจะเห็นรหัสผ่านของครู และพอครูเปลี่ยน PIN แล้วหน้าเว็บจะยังบอกค่าเก่าอยู่`
  );
});

test('หน้าเว็บต้องไม่อ้างชื่อ field ของ PIN ตรง ๆ (แปลว่ากำลังจะพิมพ์ค่าลงไปเอง)', () => {
  const offenders = [];
  for (const file of clientFiles()) {
    if (/teacherPin\s*[:=]/.test(readFileSync(file, 'utf8'))) {
      offenders.push(path.relative(ROOT, file));
    }
  }
  assert.deepEqual(offenders, [], `พบการฝังค่า PIN ตรง ๆ ที่ ${offenders.join(', ')}`);
});

test('ฝั่งเซิร์ฟเวอร์ยังต้องมีค่าเริ่มต้นไว้ ไม่งั้นครูคนแรกเข้าไม่ได้', () => {
  // กันไว้ว่าการแก้ข้างบนไม่ได้ไปลบค่าเริ่มต้นที่จำเป็น
  const db = readFileSync(path.join(ROOT, 'src', 'lib', 'db.ts'), 'utf8');
  assert.match(
    db,
    /teacherPin:\s*'1234'/,
    'src/lib/db.ts ต้องมีค่า PIN เริ่มต้น สำหรับตอนยังไม่มีข้อมูลในระบบ'
  );
});
