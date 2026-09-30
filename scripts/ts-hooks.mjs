// ให้ Node import ไฟล์ TypeScript ในโปรเจกต์ได้ แม้ import แบบไม่ใส่นามสกุล
//
// ทำไมต้องมี
// - โค้ดใน src/ เขียน import แบบ Next.js ปกติ คือ `from './utils'` (ไม่มี .ts)
//   Next.js / webpack ตัด extension ให้เอง แต่ Node ESM ต้องการนามสกุลเต็ม
//   ถ้าไม่มี hook นี้ จะ import src/lib/db.ts มาทดสอบไม่ได้เลย
// - เทสต์ฝั่ง Redis (scripts/db-kv.test.mjs) ต้องเรียกโค้ดของจริง ไม่ใช่สำเนา
//   เพราะเทสต์ที่ผ่านกับสำเนาโค้ดไม่ได้พิสูจน์อะไรเลย
//
// ⚠️ Node ต้องเป็นเวอร์ชันที่ strip TypeScript ได้เอง (Node 24) ดู engines ใน package.json
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    // ลองเติมนามสกุล เฉพาะ import ที่เป็น relative path และยังไม่มีนามสกุล
    const relative = specifier.startsWith('./') || specifier.startsWith('../');
    const hasExt = /\.[cm]?[jt]sx?$/.test(specifier);
    if (!relative || hasExt) throw err;

    for (const ext of ['.ts', '.tsx', '.mts', '.js']) {
      try {
        return await nextResolve(specifier + ext, context);
      } catch {
        // ลองนามสกุลถัดไป
      }
    }
    throw err;
  }
}
