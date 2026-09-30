// ส่วนร่วมของทุก route ใน /api/auth

import { errorMessage } from '@/lib/api-error';

/** ตัดข้อมูลลับออกก่อนส่งกลับไป — passwordHash ไม่มีเหตุผลที่จะออกจากเซิร์ฟเวอร์เด็ดขาด */
export function safe(account: any) {
  if (!account) return null;
  const { passwordHash, ...rest } = account;
  return rest;
}

export { errorMessage };
