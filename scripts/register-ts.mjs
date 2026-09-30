// จุดเรียกสำหรับ `node --import ./scripts/register-ts.mjs`
// ลงทะเบียน resolve hook ที่เติมนามสกุลไฟล์ให้ Node หาไฟล์ TypeScript ใน src/ เจอ
// (ดูรายละเอียดใน scripts/ts-hooks.mjs)
import { register } from 'node:module';

register('./ts-hooks.mjs', import.meta.url);
