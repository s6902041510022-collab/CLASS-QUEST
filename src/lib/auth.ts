// ==================== SESSION ฝั่ง CLIENT ====================
// เก็บข้อมูลการเข้าสู่ระบบไว้ใน localStorage ของเครื่องนั้น
// เพื่อให้นักเรียน "เป็นคนเดิม" ทุกครั้งที่กลับมาเล่น และเก็บประวัติได้

const TEACHER_KEY = 'cq_teacher_session';
const STUDENT_KEY = 'cq_student_session';

export type TeacherSession = { name: string; avatar: string; at: number };
export type StudentSession = { studentId: string; name: string; avatar: string; at: number };

// ---------- ครู ----------

export function getTeacherSession(): TeacherSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(TEACHER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.name) return null;
    return parsed as TeacherSession;
  } catch {
    return null;
  }
}

export function setTeacherSession(name: string, avatar = '👨‍🏫'): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    TEACHER_KEY,
    JSON.stringify({ name, avatar, at: Date.now() })
  );
}

export function clearTeacherSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TEACHER_KEY);
}

export function isTeacherLoggedIn(): boolean {
  return getTeacherSession() !== null;
}

// ---------- นักเรียน ----------

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
