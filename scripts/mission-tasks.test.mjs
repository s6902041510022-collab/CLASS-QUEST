// เทสต์ชั้นแกนของ Mission Tasks — รัน: node --test scripts/mission-tasks.test.mjs
// เน้น 2 ข้อ: (1) ด่านเดิมต้องได้จำนวนงานเท่าเดิมทุกประการ (2) การตรวจ choice ต้องตรงของเดิมเป๊ะ
//
// ⚠️ ไฟล์นี้ import '../src/lib/mission-tasks.ts' ตรง ๆ ต้องใช้ Node ที่ strip
//    TypeScript ได้เอง (Node 24) ถ้าใช้ Node 20 จะได้ ERR_UNKNOWN_FILE_EXTENSION
//    เวลา import ไฟล์ .ts — ไม่ใช่ตัวเทสต์พัง ดู engines ใน package.json
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  missionToTasks,
  questionToTask,
  gradeTask,
  normalizeKind,
  normalizeNumber,
  answerLabel,
  correctLabel,
  blankTask,
} from '../src/lib/mission-tasks.ts';

const oldQuestion = {
  id: 'demo-q-1',
  text: 'หน่วยความจำใดเร็วที่สุด?',
  options: ['Register', 'Cache', 'RAM', 'SSD'],
  correctAnswer: 0,
  explanation: 'Register อยู่ภายใน CPU',
};

// ---------- ความเข้ากันได้กับข้อมูลเดิม ----------

test('คำถามเก่า (ไม่มี kind) กลายเป็น choice', () => {
  assert.equal(normalizeKind(oldQuestion), 'choice');
});

test('kind: "quiz" ที่ seed เก่าใส่ไว้ ถือเป็น choice', () => {
  assert.equal(normalizeKind({ ...oldQuestion, kind: 'quiz' }), 'choice');
});

test('ด่านควิซเดิมแปลงเป็นงานได้จำนวนเท่าเดิมทุกประการ', () => {
  const mission = { type: 'quiz', questions: [oldQuestion, { ...oldQuestion, id: 'q2' }] };
  const tasks = missionToTasks(mission);
  assert.equal(tasks.length, mission.questions.length);
  assert.deepEqual(
    tasks.map((t) => t.id),
    ['demo-q-1', 'q2']
  );
  assert.deepEqual(
    tasks.map((t) => t.index),
    [0, 1]
  );
});

test('ด่านบอสเดิมแปลงเป็นงานได้เหมือนกัน', () => {
  const mission = { type: 'boss', questions: [oldQuestion] };
  assert.equal(missionToTasks(mission).length, 1);
  assert.equal(missionToTasks(mission)[0].kind, 'choice');
});

test('ด่านที่ไม่มีคำถาม → งาน 0 งาน', () => {
  assert.equal(missionToTasks({ type: 'quiz' }).length, 0);
  assert.equal(missionToTasks({ type: 'quiz', questions: [] }).length, 0);
  assert.equal(missionToTasks(null).length, 0);
});

// ---------- choice: ต้องตรงพฤติกรรมเดิมเป๊ะ ----------

test('choice ตรวจเหมือนโค้ดเดิม (Number(a) === Number(b))', () => {
  const t = questionToTask(oldQuestion, 0);
  assert.equal(gradeTask(t, 0).correct, true);
  assert.equal(gradeTask(t, 1).correct, false);
  assert.equal(gradeTask(t, 3).correct, false);
});

test('choice ตอบมากกว่าจำนวนตัวเลือก = ผิด', () => {
  const t = questionToTask(oldQuestion, 0);
  assert.equal(gradeTask(t, 99).correct, false);
  assert.equal(gradeTask(t, -1).correct, false);
});

test('choice ตอบค่าที่แปลงเป็นตัวเลขไม่ได้ = ผิด (ของเดิม NaN === 0 ก็ false)', () => {
  const t = questionToTask(oldQuestion, 0);
  assert.equal(gradeTask(t, 'abc').correct, false);
  assert.equal(gradeTask(t, null).correct, false);
  assert.equal(gradeTask(t, undefined).correct, false);
});

test('choice correctAnswer เป็น "2" (string) ก็ยังเทียบผ่าน เหมือนของเดิม', () => {
  const t = questionToTask({ ...oldQuestion, correctAnswer: '2' }, 0);
  assert.equal(gradeTask(t, 2).correct, true);
  assert.equal(gradeTask(t, 3).correct, false);
});

// ---------- numeric ----------

const numQ = { id: 'n1', kind: 'numeric', text: '1 KB กี่บิต?', correctAnswer: 8192, unit: 'บิต' };

test('numeric ตอบถูก/ผิดตามปกติ', () => {
  const t = questionToTask(numQ, 0);
  assert.equal(t.kind, 'numeric');
  assert.equal(gradeTask(t, 8192).correct, true);
  assert.equal(gradeTask(t, '8192').correct, true);
  assert.equal(gradeTask(t, 1024).correct, false);
});

test('numeric ยอมลูกน้ำคั่น/เว้นวรรค/หน่วยปน', () => {
  const t = questionToTask(numQ, 0);
  assert.equal(gradeTask(t, '8,192').correct, true);
  assert.equal(gradeTask(t, ' 8192 ').correct, true);
  assert.equal(gradeTask(t, '8192 บิต').correct, true);
});

test('numeric รับหลายคำตอบที่ถือว่าถูก (ครูใส่ "1024|1 024")', () => {
  const t = questionToTask({ ...numQ, correctAnswer: '1024 | 1 024' }, 0);
  assert.equal(gradeTask(t, 1024).correct, true);
  assert.equal(gradeTask(t, '1,024').correct, true);
  assert.equal(gradeTask(t, 2048).correct, false);
});

test('numeric คำตอบที่เป็นตัวอักษร ไม่ผ่านการแยกคำตอบหลายคำตอบ', () => {
  const t = questionToTask({ ...numQ, correctAnswer: '1 | one' }, 0);
  assert.equal(gradeTask(t, 1).correct, true);
  assert.equal(gradeTask(t, 'one').correct, false);
});

test('numeric ตอบเป็นตัวอักษรล้วน = ผิด ไม่ใช่ถูกแบบ NaN', () => {
  const t = questionToTask(numQ, 0);
  assert.equal(gradeTask(t, 'เยอะมาก').correct, false);
  assert.equal(gradeTask(t, '').correct, false);
});

test('normalizeNumber อ่านเลขทศนิยมและเลขลบได้', () => {
  assert.equal(normalizeNumber('3.5'), 3.5);
  assert.equal(normalizeNumber('-12'), -12);
  assert.equal(normalizeNumber('1,024'), 1024);
  assert.equal(normalizeNumber('abc'), null);
  assert.equal(normalizeNumber(null), null);
});

test('numeric ทศนิยมเทียบแบบคลาดเคลื่อนเล็กน้อย', () => {
  const t = questionToTask({ id: 'n2', kind: 'numeric', text: 'x', correctAnswer: 0.1 + 0.2 }, 0);
  assert.equal(gradeTask(t, 0.3).correct, true);
});

// ---------- match ----------

const matchQ = {
  id: 'm1',
  kind: 'match',
  text: 'จับคู่หน่วยความจำ',
  pairs: [
    { a: 'RAM', b: 'ทำงานเร็ว' },
    { a: 'SSD', b: 'เก็บข้อมูลถาวร' },
    { a: 'HDD', b: 'เก็บข้อมูลเยอะ' },
  ],
};

test('match จับคู่ถูกทุกคู่ = ถูก', () => {
  const t = questionToTask(matchQ, 0);
  assert.equal(t.kind, 'match');
  assert.equal(t.pairs.length, 3);
  assert.equal(gradeTask(t, [0, 1, 2]).correct, true);
});

test('match สลับแค่ 1 คู่ = ผิด', () => {
  const t = questionToTask(matchQ, 0);
  assert.equal(gradeTask(t, [1, 0, 2]).correct, false);
  assert.equal(gradeTask(t, [0, 2, 1]).correct, false);
});

test('match จับไม่ครบ / ผิดจำนวน = ผิด ไม่ error', () => {
  const t = questionToTask(matchQ, 0);
  assert.equal(gradeTask(t, [0, 1]).correct, false);
  assert.equal(gradeTask(t, []).correct, false);
  assert.equal(gradeTask(t, null).correct, false);
  assert.equal(gradeTask(t, '0,1,2').correct, false);
});

test('match ที่ครูใส่คู่ไม่ครบ (a หรือ b ว่าง) จะถูกกรองออก', () => {
  const t = questionToTask({ ...matchQ, pairs: [{ a: 'RAM', b: 'x' }, { a: '', b: 'y' }] }, 0);
  assert.equal(t.pairs.length, 1);
  assert.equal(gradeTask(t, [0]).correct, true);
});

test('match ที่ไม่มีคู่เลย = ผิด ไม่ crash', () => {
  const t = questionToTask({ id: 'm2', kind: 'match', text: 'x', pairs: [] }, 0);
  assert.equal(gradeTask(t, []).correct, false);
  assert.equal(gradeTask(t, null).correct, false);
});

// ---------- ข้อความสำหรับผลวิเคราะห์ ----------

test('ข้อความ choice เหมือน optText เดิม (A (Register))', () => {
  const t = questionToTask(oldQuestion, 0);
  assert.equal(answerLabel(t, 0), 'A (Register)');
  assert.equal(correctLabel(t), 'A (Register)');
});

test('ข้อความ numeric มีหน่วยติดมา', () => {
  const t = questionToTask(numQ, 0);
  assert.equal(answerLabel(t, '8192'), '8192 บิต');
  assert.equal(correctLabel(t), '8192 บิต');
});

test('ข้อความ match บอกว่าจับผิดกี่คู่และคู่ไหน', () => {
  const t = questionToTask(matchQ, 0);
  assert.equal(answerLabel(t, [0, 1, 2]), 'จับคู่ถูกครบ 3 คู่');
  assert.equal(answerLabel(t, [1, 0, 2]), 'จับผิด 2/3 คู่: RAM, SSD');
  assert.equal(answerLabel(t, []), 'ยังไม่ได้จับคู่');
  assert.equal(correctLabel(t), 'RAM → ทำงานเร็ว, SSD → เก็บข้อมูลถาวร, HDD → เก็บข้อมูลเยอะ');
});

test('answerLabel ที่ไม่มี task (ข้อมูลเก่า) ไม่ crash', () => {
  assert.equal(typeof answerLabel(null, 0), 'string');
  assert.equal(answerLabel(null, 0), '0');
  assert.equal(correctLabel(null), '');
});

// ---------- blankTask ----------

test('blankTask ทำงานได้ทุกชนิด', () => {
  assert.equal(blankTask('x1').kind, 'choice');
  assert.equal(blankTask('x2').options.length, 4);
  assert.equal(blankTask('x3', 'numeric').correctAnswer, '');
  assert.equal(blankTask('x4', 'match').pairs.length, 2);
});
