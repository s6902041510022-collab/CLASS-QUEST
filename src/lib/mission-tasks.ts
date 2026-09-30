// ==================== MISSION TASKS ====================
// ทุกชนิดของคำถามถูกแปลงเป็น "งาน" (Task) ชุดเดียวกันก่อนเข้า engine
// → เพิ่มชนิดคำถามใหม่ได้โดยไม่ต้องแก้ระบบเดินตำแหน่ง / การนับคะแนน / analytics
//
// ข้อสำคัญ: Task.id คือ id เดิมของคำถาม และ missionToTasks(ด่านควิซ).length
// เท่ากับ questions.length เสมอ → posMission / posQuestion ที่บันทึกไว้เดิมยังอ่านได้ถูกต้อง

export type TaskKind = 'choice' | 'numeric' | 'match';

export type Task = {
  /** id เดิมของคำถาม — ใช้กันตอบซ้ำ + ผูกกับ answers[] ใน player */
  id: string;
  /** ลำดับของงานในด่าน (0-based) = ค่า posQuestion */
  index: number;
  kind: TaskKind;
  /** = question.text */
  prompt: string;
  explanation: string;
  /** มีเฉพาะ kind 'choice' */
  options: string[];
  /** choice: ตัวเลขชี้ index | numeric: ตัวเลข/ข้อความคำตอบ | match: ไม่ใช้ (ดู pairs) */
  correctAnswer: any;
  /** หน่วยสำหรับ kind 'numeric' เช่น "บิต", "เมตร" */
  unit?: string;
  /** kind 'match' — จับคู่ a → b โดยสลับกันหมด */
  pairs?: { a: string; b: string }[];
};

/** รายการชนิดคำถามสำหรับ UI ฝั่งครู */
export const TASK_KINDS: { value: TaskKind; label: string; hint: string }[] = [
  {
    value: 'choice',
    label: 'ตัวเลือก',
    hint: 'เลือก 1 คำตอบจากหลายตัว (แบบเดิม) — รองรับ A B C D',
  },
  {
    value: 'numeric',
    label: 'กรอกตัวเลข',
    hint: 'นักเรียนพิมพ์คำตอบเป็นตัวเลข เช่น "กี่บิต" — ใส่หน่วยได้',
  },
  {
    value: 'match',
    label: 'จับคู่',
    hint: 'นักเรียนจับคู่ฝั่งซ้ายกับขวา โดยกดทีละคู่ (ไม่ต้องลาก)',
  },
];

/**
 * คำถามเก่าไม่มี field `kind` เลย → ถือเป็น 'choice' เสมอ
 * (ข้อมูลเดิมบางรายการใช้ kind: 'quiz' ซึ่งก็ถือเป็นตัวเลือกเหมือนกัน)
 */
export function normalizeKind(question: any): TaskKind {
  const k = String(question?.kind ?? '').trim().toLowerCase();
  if (k === 'numeric' || k === 'number') return 'numeric';
  if (k === 'match' || k === 'pairs') return 'match';
  return 'choice';
}

function toPairs(raw: any): { a: string; b: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p: any) => ({ a: String(p?.a ?? ''), b: String(p?.b ?? '') }))
    .filter((p: { a: string; b: string }) => p.a !== '' && p.b !== '');
}

/** แปลงคำถาม 1 ข้อ → Task 1 งาน */
export function questionToTask(question: any, index: number): Task {
  const kind = normalizeKind(question);
  return {
    id: String(question?.id ?? `task-${index}`),
    index,
    kind,
    prompt: String(question?.text ?? ''),
    explanation: String(question?.explanation ?? ''),
    options: Array.isArray(question?.options) ? question.options.map((o: any) => String(o)) : [],
    correctAnswer: question?.correctAnswer,
    unit: question?.unit ? String(question.unit) : '',
    pairs: kind === 'match' ? toPairs(question?.pairs) : undefined,
  };
}

/**
 * แปลงทั้งด่าน → งานทั้งหมด
 * ด่านควิซ/บอส (questions[]) ยังคืนจำนวนเท่าเดิมทุกประการ = ไม่กระทบข้อมูลเก่า
 */
export function missionToTasks(mission: any): Task[] {
  const list = Array.isArray(mission?.questions) ? mission.questions : [];
  return list.map((q: any, i: number) => questionToTask(q, i));
}

/** ด่านนี้มีงานให้ทำจริงไหม (ใช้ข้ามด่านที่ว่าง) */
export function missionHasWork(mission: any): boolean {
  return missionToTasks(mission).length > 0;
}

// ==================== การตรวจคำตอบ ====================

export type GradeResult = { correct: boolean };

/** "1,024" / "1 024" / " 1024 " → 1024 ; อ่านไม่ได้ → null */
export function normalizeNumber(value: any): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value == null) return null;
  const cleaned = String(value).replace(/[\s,_]/g, '').trim();
  if (cleaned === '') return null;
  // ตัดหน่วยท้าย เช่น "1024บิต" → "1024"
  const m = cleaned.match(/^-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

/** เทียบตัวเลขแบบยอมให้คลาดเคลื่อนเล็กน้อย (กันเลขทศนิยมยาว) */
function numbersClose(a: number, b: number): boolean {
  if (a === b) return true;
  const tol = Math.max(1e-9, Math.abs(b) * 1e-9);
  return Math.abs(a - b) <= tol;
}

/** ครูใส่ "1024|1 024" เพื่อรับหลายคำตอบที่ถือว่าถูก */
function acceptedNumbers(correctAnswer: any): number[] {
  if (Array.isArray(correctAnswer)) {
    return correctAnswer.map(normalizeNumber).filter((n): n is number => n !== null);
  }
  if (typeof correctAnswer === 'number') return [correctAnswer];
  const parts = String(correctAnswer ?? '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
  const nums = parts.map(normalizeNumber).filter((n): n is number => n !== null);
  return nums.length ? nums : [Number.NaN];
}

/**
 * ตรวจคำตอบของทุกชนิด
 * - choice: ตัวเลขชี้ index (พฤติกรรมเดิมเป๊ะ)
 * - numeric: เทียบตัวเลข ยอมหลายคำตอบ/หน่วยปน/ลูกน้ำคั่น
 * - match:   response คือ array ความยาวเท่า pairs — ต้องจับคู่ถูกทุกคู่
 */
export function gradeTask(task: Task, response: any): GradeResult {
  // กันช่องโหว่: Number(null) === 0 ทำให้ "ไม่ได้ตอบ" กลายเป็นตอบถูกเมื่อเฉลยเป็น 0
  // (โค้ดเดิมกันที่ API ก่อนเขียนคะแนน — ย้ายมาไว้ที่ชั้นเดียวกันแล้ว)
  if (response == null || response === '') return { correct: false };

  if (task.kind === 'choice') {
    const picked = Number(response);
    return { correct: Number.isFinite(picked) && picked === Number(task.correctAnswer) };
  }

  if (task.kind === 'numeric') {
    const given = normalizeNumber(response);
    if (given === null) return { correct: false };
    return { correct: acceptedNumbers(task.correctAnswer).some((n) => numbersClose(given, n)) };
  }

  if (task.kind === 'match') {
    const size = task.pairs?.length || 0;
    if (size === 0) return { correct: false };
    const chosen = Array.isArray(response) ? response : null;
    if (!chosen || chosen.length !== size) return { correct: false };
    // chosen[i] = ฝั่งขวาที่นักเรียนเลือกจับคู่กับ a[i] — ถูกเมื่อเป็น identity ทั้งหมด
    return { correct: chosen.every((b: any, i: number) => Number(b) === i) };
  }

  return { correct: false };
}

// ==================== ข้อความสำหรับผลวิเคราะห์ ====================

/** ข้อความคำตอบที่นักเรียนให้มา (สำหรับแสดงในผลวิเคราะห์) */
export function answerLabel(task: Task | null | undefined, value: any): string {
  if (!task) {
    const n = Number(value);
    return Number.isFinite(n) ? String(value) : String(value ?? '');
  }

  if (task.kind === 'choice') {
    const i = Number(value);
    const opt = task.options[i];
    return opt != null && opt !== '' ? `${String.fromCharCode(65 + i)} (${opt})` : `ข้อ ${String.fromCharCode(65 + i)}`;
  }

  if (task.kind === 'numeric') {
    const s = String(value ?? '').trim();
    return task.unit ? `${s} ${task.unit}` : s;
  }

  if (task.kind === 'match') {
    const pairs = task.pairs || [];
    const size = pairs.length;
    const chosen = Array.isArray(value) ? value : [];
    if (!chosen.length) return 'ยังไม่ได้จับคู่';
    const wrong = pairs.map((p, i) => ({ p, ok: Number(chosen[i]) === i })).filter((x) => !x.ok);
    if (!wrong.length) return `จับคู่ถูกครบ ${size} คู่`;
    return `จับผิด ${wrong.length}/${size} คู่: ${wrong.map((x) => x.p.a).join(', ')}`;
  }

  return String(value ?? '');
}

/** ข้อความเฉลย */
export function correctLabel(task: Task | null | undefined): string {
  if (!task) return '';
  if (task.kind === 'choice') {
    const i = Number(task.correctAnswer);
    const opt = task.options[i];
    return opt != null && opt !== '' ? `${String.fromCharCode(65 + i)} (${opt})` : `ข้อ ${String.fromCharCode(65 + i)}`;
  }
  if (task.kind === 'numeric') {
    const raw = String(task.correctAnswer ?? '');
    return task.unit ? `${raw} ${task.unit}` : raw;
  }
  if (task.kind === 'match') {
    return (task.pairs || []).map((p) => `${p.a} → ${p.b}`).join(', ');
  }
  return String(task.correctAnswer ?? '');
}

/** สร้างคำถามเปล่า 1 ข้อสำหรับฟอร์มครู */
export function blankTask(id: string, kind: TaskKind = 'choice'): any {
  if (kind === 'numeric') {
    return { id, kind, text: '', correctAnswer: '', unit: '', explanation: '' };
  }
  if (kind === 'match') {
    return {
      id,
      kind,
      text: '',
      pairs: [
        { a: '', b: '' },
        { a: '', b: '' },
      ],
      explanation: '',
    };
  }
  return {
    id,
    kind: 'choice',
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
  };
}
