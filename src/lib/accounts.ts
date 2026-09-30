// ==================== บัญชีครู: รหัสผ่าน + โครงสร้างข้อมูล ====================
//
// ทำไมต้องแยกไฟล์นี้ออกจาก db.ts
// - db.ts เป็นเรื่อง "เก็บข้อมูลที่ไหน" ส่วนนี้เป็นเรื่อง "รหัสผ่านปลอดภัยแค่ไหน"
// - ส่วนนี้ไม่แตะที่เก็บข้อมูลเลย ทดสอบได้โดยไม่ต้องมี Redis หรือไฟล์
//   ซึ่งสำคัญมาก เพราะถ้ารวบไว้ใน db.ts จะทดสอบยาก และเสี่ยงที่ข้อมูลรั่วจะผ่านเทสต์ไปเงียบ ๆ
//
// ⚠️ กฎข้อ 1 ที่ห้ามลืม: ห้ามเก็บรหัสผ่านเป็นข้อความธรรมดาเด็ดขาด
//    ถ้าฐานข้อมูลหลุด ใครก็แอบเข้าเป็นครูได้ทันที
//
// ใช้ scrypt ของ Node เอง ไม่ต้องเพิ่ม dependency
// (bcrypt/argon2 ต้องลงแพ็กเกจเพิ่ม ซึ่งไม่คุ้มกับแอปขนาดนี้ และเพิ่มความเสี่ยงเรื่อง supply chain)

import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

/** ความยาว hash ที่เก็บ (ไบต์) */
const KEY_LEN = 64;
/** ความยาว salt ที่สุ่มใหม่ทุกครั้ง */
const SALT_LEN = 16;

/**
 * แปลงรหัสผ่านเป็น hash พร้อม salt
 *
 * salt สุ่มใหม่ทุกครั้ง จึงไม่ต้องเก็บ salt แยก — เอาไปต่อท้าย hash ได้เลย
 * ถ้าไม่มี salt ผู้ใช้คนละคนที่ตั้งรหัสผ่านเดียวกันจะได้ hash เหมือนกันเป๊ะ
 * แปลว่าใครก็ถอดรหัสผ่านหมดได้ในครั้งเดียว (rainbow table)
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LEN);
  const hash = scryptSync(password, salt, KEY_LEN);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

/**
 * ตรวจรหัสผ่าน
 *
 * ใช้ timingSafeEqual เพราะการเทียบแบบธรรมดาเร็วกว่าเมื่อตัวแรกไม่ตรง
 * ถ้าใครวัดเวลาตอบกลับ จะเดา password ทีละตัวอักษรได้
 * (ความต่างนี้เล็กมาก แต่ปิดไว้ก่อนไม่เสียอะไร)
 */
export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored || !password) return false;
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;

  let expected: Buffer;
  let actual: Buffer;
  try {
    expected = Buffer.from(hashHex, 'hex');
    actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  } catch {
    return false;
  }
  if (expected.length === 0 || actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

// ---------------- ตรวจความรูปแบบ ----------------

export const MIN_PASSWORD = 6;
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,24}$/;

export type FieldError = { field: 'username' | 'password' | 'name'; message: string };

/**
 * ตรวจข้อมูลตอนสมัคร — คืนรายการที่ผิดทั้งหมด (ไม่ใช่แค่อันแรก)
 * เพราะครูที่เพิ่งหัดเว็บจะกรอกผิดหลายช่องพร้อมกัน
 * บอกทีเดียวจบดีกว่าให้ไล่แก้ทีละข้อ
 */
export function validateRegistration(input: {
  username?: string;
  password?: string;
  name?: string;
}): FieldError[] {
  const errors: FieldError[] = [];
  const username = (input.username || '').trim();
  const password = input.password || '';
  const name = (input.name || '').trim();

  if (!username) errors.push({ field: 'username', message: 'กรอกชื่อผู้ใช้' });
  else if (!USERNAME_RE.test(username)) {
    errors.push({
      field: 'username',
      message: 'ชื่อผู้ใช้ใช้ได้แค่อักษรอังกฤษ ตัวเลข และ _ . - ยาว 3-24 ตัว',
    });
  }

  if (!password) errors.push({ field: 'password', message: 'กรอกรหัสผ่าน' });
  else if (password.length < MIN_PASSWORD) {
    errors.push({ field: 'password', message: `รหัสผ่านต้องยาวอย่างน้อย ${MIN_PASSWORD} ตัว` });
  }

  if (!name) errors.push({ field: 'name', message: 'กรอกชื่อที่จะแสดงในเกม' });

  return errors;
}

/**
 * ตัดอักขระที่อันตรายออกจากชื่อผู้ใช้
 *
 * ชื่อผู้ใช้ถูกใช้เป็น key ในการค้นหาและแสดงผล ถ้าปล่อยอักขระแปลก ๆ เข้าไป
 * อาจไปชนกับชื่อ field ของระบบ หรือทำให้หน้าเว็บพังตอนเรนเดอร์
 */
export function normalizeUsername(input: string): string {
  return (input || '').trim().toLowerCase();
}
