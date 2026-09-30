// กันไม่ให้ PIN ครูหลุดไปอยู่ในโค้ดที่ส่งไปให้เบราว์เซอร์ หรือค้างอยู่ในโค้ดที่ไม่ได้ใช้แล้ว
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
// 📌 อัปเดต: ระบบเลิกใช้ PIN แล้ว เปลี่ยนเป็น username + password ต่อบัญชี
//    เทสต์จึงเพิ่มการตรวจว่า "โค้ดที่ไม่ได้ใช้แล้ว" ถูกลบออกจริง ไม่ใช่แค่ซ่อนไว้
//    เพราะการปล่อย PIN ไว้ แม้ไม่มีใครเรียก ก็ยังเป็นความเสี่ยงตอนโค้ดถูกอ่าน
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
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

/**
 * ตัดคอมเมนต์ออกก่อนตรวจ
 *
 * เหตุผล: ไฟล์ที่เราอยากให้ "พูดถึง PIN ได้" คือคอมเมนต์ที่อธิบายว่าทำไมถึงลบ
 * ถ้าตรวจทั้งไฟล์ เทสต์นี้จะไปชนคอมเมนต์ตัวเอง แล้วคนอ่านจะเลิกไว้ใจมัน
 * ซึ่งแย่กว่าไม่มีเทสต์ — เพราะที่อยากกันคือ "โค้ดที่ทำงานอยู่"
 * ถ้าอยากกันแค่คอมเมนต์ด้วย ให้เขียนชื่อฟิลด์แบบแยกคำ (เช่น teacher\u200bPin)
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

test('รหัส PIN ต้องหายไปจากโค้ดทั้งหมด ไม่ใช่แค่ซ่อนจากหน้าเว็บ', () => {
  // เดิม PIN ถูก "เก็บไว้ฝั่งเซิร์ฟ" เพราะตอนนั้นยังเป็นวิธีเข้าสู่ระบบจริง
  // พอเปลี่ยนมาใช้ username + password รหัสเก่าก็ไม่มีเหตุผลที่จะอยู่ต่อ
  // ถ้ายังอยู่ แปลว่ามีทางเข้าระบบที่ไม่ได้อยู่ในบัญชีครู — เป็นช่องโหว่
  const targets = [
    path.join('src', 'lib', 'db.ts'),
    path.join('src', 'lib', 'auth.ts'),
    path.join('src', 'lib', 'auth-server.ts'),
    path.join('src', 'lib', 'accounts.ts'),
    path.join('data', 'db.default.json'),
    path.join('data', 'db.json'),
    path.join('.env.example'),
    'HANDOFF.md',
  ];
  const offenders = [];
  for (const rel of targets) {
    const full = path.join(ROOT, rel);
    if (!existsSync(full)) continue;
    if (/teacherPin|verifyPin/.test(stripComments(readFileSync(full, 'utf8')))) offenders.push(rel);
  }
  assert.deepEqual(
    offenders,
    [],
    `ยังมีระบบ PIN หลงเหลือที่ ${offenders.join(', ')} — ต้องลบให้หมด ไม่ใช่ปล่อยไว้ "เผื่อมี"`
  );
});

test('หน้าเว็บต้องไม่มี PIN เริ่มต้น (1234) ปรากฏที่ไหนเลย แม้แต่ตัวอักษรเดียว', () => {
  // เดิมจับแค่เลข 1234 ซึ่งไม่ครอบคลุมกรณี PIN ถูกเขียนเป็นเลขอื่น
  // เช่น 8888 — ซึ่งแย่กว่าเดิม เพราะเลขที่ตั้งไว้คือรหัสจริงของระบบ
  const offenders = [];
  for (const file of clientFiles()) {
    const src = stripComments(readFileSync(file, 'utf8'));
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

test('หน้าเว็บต้องไม่มี hash รหัสผ่านหรือชื่อคุกกี้เซสชันติดไปกับโค้ดฝั่งบราวเซอร์', () => {
  // คุกกี้ต้อง HttpOnly และต้องอ่านสถานะจาก API เท่านั้น
  // ถ้า passwordHash ไหลลง HTML ใครก็ถอดรหัสครูทุกคนได้จาก View Source
  // cq_session ก็เช่นกัน: ถ้าฝั่งบราวเซอร์อ่านได้ แปลว่าไม่ได้ตั้ง HttpOnly
  const secrets = ['passwordHash', 'cq_session'];
  const offenders = [];
  for (const file of clientFiles()) {
    const src = stripComments(readFileSync(file, 'utf8'));
    const hit = secrets.filter((s) => src.includes(s));
    if (hit.length) offenders.push(`${path.relative(ROOT, file)} (${hit.join(', ')})`);
  }
  assert.deepEqual(offenders, [], `พบของต้องห้ามในโค้ดฝั่งบราวเซอร์ที่ ${offenders.join(', ')}`);
});

test('หน้าเว็บต้องไม่อ้างชื่อ field ของ PIN ตรง ๆ (แปลว่ากำลังจะพิมพ์ค่าลงไปเอง)', () => {
  const offenders = [];
  for (const file of clientFiles()) {
    if (/teacherPin\s*[:=]/.test(stripComments(readFileSync(file, 'utf8')))) {
      offenders.push(path.relative(ROOT, file));
    }
  }
  assert.deepEqual(offenders, [], `พบการฝังค่า PIN ตรง ๆ ที่ ${offenders.join(', ')}`);
});
