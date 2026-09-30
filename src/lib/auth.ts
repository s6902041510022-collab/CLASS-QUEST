// ==================== สถานะการเข้าสู่ระบบ (ฝั่ง client) ====================
//
// ⚠️ เปลี่ยนใหญ่: เดิมเก็บสถานะครูไว้ใน localStorage ซึ่ง "แก้เองได้จาก console เบราว์เซอร์"
//    ตอนนี้ความจริงอยู่ที่คุกกี้ cq_session (HttpOnly) ที่เซิร์ฟเวอร์ตั้งตอนเข้าสู่ระบบ
//    ฝั่งนี้จึงไม่เก็บอะไรเอง แค่ถามเซิร์ฟเวอร์ว่าล็อกอินอยู่หรือยัง
//    (คุกกี้ HttpOnly = JavaScript อ่านไม่ได้ จึงต้องถามทาง HTTP เท่านั้น)
//
// localStorage ที่เคยเก็บไว้ในเบราว์เซอร์เดิมจะถูกล้างทิ้งตอนโหลดหน้านี้
// เพื่อไม่ให้หน้าครูอื่นที่ยังเรียก setTeacherSession เขียนค่าหลอกกลับมา

const TEACHER_KEY = 'cq_teacher_session';
const STUDENT_KEY = 'cq_student_session';

export type TeacherSession = { name: string; avatar: string; username: string };
export type StudentSession = { studentId: string; name: string; avatar: string; at: number };

/**
 * ล้างสถานะเก่าที่เคยเก็บใน localStorage
 *
 * ไม่ได้ทำตอน import โมดูล เพราะ import คือ side effect ที่แอบมา
 * และถ้าโมดูลนี้ถูกโหลดตอน server render จะได้ผลข้างเคียงที่ไม่ต้องการ
 * เรียกตอนหน้าเว็บถามสถานะครั้งแรกแทน — ผลเหมือนกัน แต่เห็นเหตุผลในจุดที่เกิด
 */
function purgeLegacyTeacherFlag() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(TEACHER_KEY);
  } catch {
    /* โหมดส่วนตัวของเบราว์เซอร์ — เข้า localStorage ไม่ได้ ข้ามไป */
  }
}

// ---------- ครู ----------

/**
 * อายุแคชฝั่ง client
 *
 * ไม่ได้แคชตลอดชีวิตของหน้าเว็บ เพราะเซสชันฝั่งเซิร์ฟเวอร์อาจตายไปแล้ว
 * โดยที่หน้าเว็บไม่รู้ เช่น ครูเปลี่ยนรหัสผ่านจากอีกเครื่อง หรือครูกดออกจากระบบที่อีกแท็บ
 * ถ้าแคชไว้ถาวร หน้าเว็บจะเชื่อว่ายังล็อกอินอยู่ พาไปหน้าที่ล้มเหลว
 * แล้วผู้ใช้เจอ "โหลดข้อมูลไม่สำเร็จ" ทั้งที่จริง ๆ แค่ต้องล็อกอินใหม่
 *
 * 30 วินาที = พอให้ component หลายตัวในหน้าเดียวกันถามร่วมกันได้โดยไม่ยิงซ้ำ
 * แต่ไม่นานพอจะทำให้คนเชื่อสถานะเก่าทั้งที่เซสชันตายไปแล้ว
 */
const CACHE_MS = 30_000;

let cache: TeacherSession | null = null;
let cachedAt = 0;

/**
 * คำขอที่ยังบินไปไม่ถึงเซิร์ฟเวอร์
 *
 * ไม่งั้น component ที่ mount พร้อมกัน (เช่น TeacherHeader กับตัวหน้าเอง)
 * จะยิง /api/auth พร้อมกัน N ครั้ง เพราะแคชยังไม่เต็มตอนที่พวกเขาโหลด
 * ซึ่งเกิดขึ้นจริงทุกครั้งที่เปิดหน้าครู ไม่ใช่กรณีพิเศษ
 */
let inFlight: Promise<TeacherSession | null> | null = null;

/**
 * เลขรุ่นของสถานะ — ขยับทุกครั้งที่ "ลืน" สถานะทิ้ง
 *
 * มีไว้กันกรณีนี้: หน้าเว็บยิง /api/auth ไปแล้ว ครูกดออกจากระบบก่อนคำตอบจะกลับมา
 * ถ้าคำตอบเก่ายังเขียนทับแคชทิ้ง หน้าเว็บจะเชื่อว่ายังล็อกอินอยู่
 * แล้วพาไปหน้าที่โหลดข้อมูลไม่ได้ ทั้งที่ครูเพิ่งออกจากระบบไป
 */
let generation = 0;

/**
 * ครูที่ล็อกอินอยู่ หรือ null
 *
 * คืนค่าที่แคชไว้ในหน้าที่ (พอสำหรับทุก component ที่ยิงพร้อมกัน)
 * เรียก force() เมื่อเพิ่งเข้า/ออก เพื่อให้เห็นค่าใหม่ทันที
 */
export async function getTeacherSession(force = false): Promise<TeacherSession | null> {
  if (typeof window === 'undefined') return null;
  // คีย์เก่ายังไม่มีใครอ่านแล้ว — ล้างทิ้งที่นี่ทีเดียว ตอนหน้าเว็บถามสถานะครั้งแรก
  purgeLegacyTeacherFlag();

  // มีคนกำลังถามอยู่แล้ว → ต่อคิวเข้าไปใช้คำตอบเดียวกัน
  if (inFlight && !force) return inFlight;

  // cachedAt เริ่มที่ 0 เสมอ = ยังไม่เคยถาม จึงต้องถามจริงแน่นอนรอบแรก
  if (!force && Date.now() - cachedAt < CACHE_MS) return cache;

  const startedAt = generation;
  inFlight = (async () => {
    let next: TeacherSession | null = null;
    try {
      const r = await fetch('/api/auth', { cache: 'no-store' });
      const body = await r.json();
      next = body?.success && body.data ? body.data : null;
    } catch {
      // ยังไม่ต่อเน็ต — ถือว่ายังไม่ล็อกอิน ปล่อยให้หน้าจอยังใช้งานได้
      next = null;
    }
    // ระหว่างที่รอ สถานะอาจถูกลืนไปแล้ว (ออกจากระบบ/เปลี่ยนรหัสผ่าน)
    // คำตอบของคำขอเก่าจะหลุดจากความจริงไปแล้ว — ทิ้งไป ไม่เขียนทับ
    if (startedAt !== generation) return cache;

    cache = next;
    cachedAt = Date.now();
    inFlight = null;
    return cache;
  })();

  return inFlight;
}

export async function isTeacherLoggedIn(): Promise<boolean> {
  return (await getTeacherSession()) !== null;
}

/**
 * ลืมสถานะฝั่ง client โดยไม่ยิงเน็ต
 *
 * ใช้ตอน "เซิร์ฟเวอร์ตัดเซสชันให้ตายไปแล้ว" เช่น เปลี่ยนรหัสผ่านเสร็จ
 * ซึ่ง DELETE /api/auth ตอนนั้นจะได้ 401 เปล่า ๆ (เซสชันถูกลบไปแล้ว)
 * ถ้าไม่ลืนแคช หน้าถัดไปจะยังเชื่อว่าล็อกอินอยู่ แล้วพาไปหน้าที่พัง
 */
export function forgetTeacherSession(): void {
  cache = null;
  cachedAt = 0;
  generation += 1; // ทิ้งคำตอบของคำขอที่ค้างอยู่
  inFlight = null;
  purgeLegacyTeacherFlag();
}

/**
 * ออกจากระบบ
 *
 * ลบทั้งเซสชันฝั่งเซิร์ฟเวอร์และคุกกี้ ไม่ใช่แค่บอกเบราว์เซอร์ว่า "ไม่ล็อกอิน"
 * ไม่งั้นคนอื่นที่แอบเอาโทเคนไปยังเข้าได้อีก 30 วัน
 */
export async function clearTeacherSession(): Promise<void> {
  try {
    await fetch('/api/auth', { method: 'DELETE' });
  } catch {
    /* ตัดการเชื่อมต่อไม่สำเร็จ — คุกกี้จะหมดอายุเอง */
  }
  forgetTeacherSession();
}

// ---------- นักเรียน ----------
// ยังเก็บใน localStorage เหมือนเดิม เพราะนักเรียนไม่มีรหัสผ่าน
// ตัวยืนยันฝั่งเซิร์ฟเวอร์คือคุกกี้ cq_student ที่ตั้งตอนเข้าห้อง

export function getStudentSession(): StudentSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STUDENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.studentId) return null;
    return parsed as StudentSession;
  } catch {
    return null;
  }
}

export function setStudentSession(studentId: string, name: string, avatar: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    STUDENT_KEY,
    JSON.stringify({ studentId, name, avatar, at: Date.now() })
  );
}

export function clearStudentSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STUDENT_KEY);
}

export function isStudentLoggedIn(): boolean {
  return getStudentSession() !== null;
}
