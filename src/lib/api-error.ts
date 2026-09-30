/**
 * ข้อความ error ที่ส่งกลับให้ client
 *
 * ทำไมต้องม้ — เคยเจอกรณีนี้จริง: deploy บน Vercel แล้วครูล็อกอินไม่ได้
 * ทุก route จับ error ทิ้ง (`catch {`) แล้วตอบว่า "โหลดข้อมูลไม่สำเร็จ" เหมือนกันหมด
 * สาเหตุจริงคือ EROFS (filesystem ของ Vercel เป็น read-only) ซึ่งบอกได้ว่า
 * ต้องไปตั้ง KV_REST_API_URL / KV_REST_API_TOKEN แต่ถูกซ่อนไว้ ทำให้ไม่มีทางรู้
 *
 * ปลอดภัยพอที่จะส่งกลับ เพราะข้อความของ Error มีแต่ชื่อไฟล์ รหัส error
 * และคำแนะนำการตั้งค่า — ไม่มี token หรือค่า secret อยู่ในนี้
 */
export function errorMessage(err: any, fallback: string): string {
  const raw = err?.message ?? err;
  if (typeof raw !== 'string') return fallback;
  // เอาแค่บรรทัดแรกและไม่ยาวเกิน 300 ตัวอักษร เผื่อกัน payload บวม
  const text = raw.split('\n')[0].trim().slice(0, 300);
  return text || fallback;
}
