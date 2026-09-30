// ทดสอบว่าเกมเดิม (คำถามแบบตัวเลือก + บอส) ยังเล่นได้เหมือนเดิมหลัง refactor เป็น Task model
// รัน: node --test scripts/e2e-choice.test.mjs     (ต้องมี dev server รันอยู่ที่ port 3000)
// ใช้เกมที่สร้างขึ้นมาเฉพาะการทดสอบ แล้วลบทิ้ง — ไม่แตะข้อมูลเกมจริง
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeClient, ok, uniqueName } from './http-client.mjs';

const BASE = process.env.CQ_BASE || 'http://localhost:3000';

// ⚠️ คนละ client: คุกกี้ครูกับคุกกี้นักเรียนต้องแยกกัน
//    (ถ้าใช้ตัวเดียว เทสต์นี้จะผ่านทั้งที่หน้าเว็บจริงไม่ได้เป็นแบบนั้น)
const teacher = makeClient(BASE);
const student = makeClient(BASE);

let gameId = '';
let playerId = '';
let studentId = '';
let missionIds = []; // ตามลำดับ: [0]=ด่าน1, [1]=ด่านว่าง, [2]=ด่าน2, [3]=บอส

// ครูทำงานผ่าน teacher client
const post = (url, body) => teacher.post(url, body);
const put = (url, body) => teacher.put(url, body);
const del = (url) => teacher.del(url);

before(async () => {
  const reg = await teacher.post('/api/auth/register', {
    username: uniqueName('cq_choice_'),
    password: 'test-password-123',
    name: 'ครูทดสอบ E2E',
  });
  ok(reg, 'สมัครบัญชีครูไม่สำเร็จ');
  assert.ok(teacher.jar.get('cq_session'), 'ต้องได้คุกกี้เซสชันหลังสมัคร');

  // เกมทดสอบ: ด่าน1(2 ข้อ) → ด่านว่าง(0 ข้อ ต้องถูกข้าม) → ด่าน2(1 ข้อ) → บอส(4 ข้อ)
  const g = await post('/api/games', {
    name: 'E2E choice test',
    subject: 'ทดสอบ',
    topic: 'ทดสอบ',
    roomCode: 'E2ETST',
    bossBattle: true,
    bossName: 'บอสทดสอบ',
    bossHp: 600,
    status: 'draft',
    mode: 'solo',
    teamCount: 2,
    timeLimit: 60,
    playerLimit: 40,
  });
  ok(g, 'สร้างเกมไม่สำเร็จ');
  gameId = g.json.data.id;

  const missions = [
    {
      gameId, type: 'quiz', title: 'ด่าน 1', xp: 100, timeLimit: 60, order: 1,
      questions: [
        { id: 'e2e-q1', text: '2 + 2 = ?', options: ['3', '4', '5'], correctAnswer: 1, explanation: '4' },
        { id: 'e2e-q2', text: 'ผลบวก 0 คือ?', options: ['0', '1', '-1'], correctAnswer: 0, explanation: 'ศูนย์' },
      ],
    },
    { gameId, type: 'quiz', title: 'ด่านว่าง (ไม่มีคำถาม)', xp: 50, timeLimit: 30, order: 2, questions: [] },
    {
      gameId, type: 'quiz', title: 'ด่าน 2', xp: 100, timeLimit: 60, order: 3,
      questions: [
        { id: 'e2e-q3', text: '10 - 4 = ?', options: ['5', '6', '7'], correctAnswer: 1, explanation: '6' },
      ],
    },
    {
      gameId, type: 'boss', title: 'บอส', xp: 100, timeLimit: 60, order: 4,
      questions: [
        { id: 'e2e-b1', text: 'บอส 1', options: ['x', 'y'], correctAnswer: 0, explanation: '' },
        { id: 'e2e-b2', text: 'บอส 2', options: ['x', 'y'], correctAnswer: 1, explanation: '' },
        { id: 'e2e-b3', text: 'บอส 3', options: ['x', 'y'], correctAnswer: 0, explanation: '' },
        { id: 'e2e-b4', text: 'บอส 4', options: ['x', 'y'], correctAnswer: 0, explanation: '' },
      ],
    },
  ];
  for (const m of missions) {
    const r = await post('/api/missions', m);
    ok(r, 'สร้าง mission ไม่สำเร็จ');
    missionIds.push(r.json.data.id);
  }

  const s = await post('/api/sessions', { gameId, force: true });
  ok(s, 'สร้าง session ไม่สำเร็จ');

  // ใช้นักเรียนทดสอบแยก ไม่ยุ่งกับนักเรียนจริง
  // (ตอนบอสตาย ระบบจะนำคะแนนรอบนี้ไปรวมในสถิติถาวรของนักเรียนด้วย)
  const st = await post('/api/students', { name: 'นักเรียนทดสอบ E2E', avatar: '🧪' });
  ok(st, 'สร้างนักเรียนทดสอบไม่สำเร็จ');
  studentId = st.json.data.id;

  // เข้าห้องด้วย client ของนักเรียน — ต้องได้คุกกี้ cq_student ไปตอบข้อ
  const p = await student.post('/api/players', { gameId, studentId });
  ok(p, 'สร้าง player ไม่สำเร็จ');
  playerId = p.json.data.id;
  assert.ok(student.jar.get('cq_student'), 'ต้องได้คุกกี้ผู้เล่นหลังเข้าห้อง');
});

after(async () => {
  if (playerId) await del('/api/players/' + playerId);
  for (const id of missionIds) await del('/api/missions/' + id);
  if (gameId) await del('/api/games/' + gameId);
  if (studentId) await del('/api/students/' + studentId);
});

// ⚠️ ตอบข้อ/เลื่อนข้อ ต้องใช้ client ของนักเรียน — route ผูกกับคุกกี้ cq_student
//    ไม่ใช่ค่าที่ส่งมา (เดิมรับ playerId จากผู้เรียก ใครก็ตอบแทนเพื่อนได้)
const getPlayer = () => teacher.get(`/api/players?id=${playerId}`).then((x) => x.json);
const answer = (missionIdx, questionId, selectedAnswer) =>
  student.post('/api/answers', {
    playerId, gameId, missionId: missionIds[missionIdx], questionId, selectedAnswer, timeTakenSec: 5,
  });
const advance = () => student.post('/api/players/advance', { playerId });

// ดูสถิตินักเรียนหลังบอสตาย — ต้องเป็นครู
const readStudents = () => teacher.get('/api/students').then((x) => x.json);
const findStudent = async () => {
  const list = await readStudents();
  return (list.data || []).find((x) => x.id === studentId);
};

// GET /api/sessions เปิดสาธารณะ (นักเรียน poll) และเป็นจุดที่เรียก settleBossDefeat
const pollSessions = () => fetch(`${BASE}/api/sessions?gameId=${gameId}`).catch(() => {});

test('เข้าเกมแล้วเริ่มที่ด่านแรก ข้อแรก', async () => {
  const r = await getPlayer();
  assert.equal(r.success, true);
  assert.equal(r.data.posMission, 0);
  assert.equal(r.data.posQuestion, 0);
  assert.equal(r.data.quizDone, false);
});

test('ตอบถูก -> เลื่อนไปข้อถัดไปในด่านเดิม', async () => {
  const r = await answer(0, 'e2e-q1', 1);
  ok(r, 'ตอบข้อ 1');
  assert.equal(r.json.data.correct, true);
  assert.equal(r.json.data.kind, 'choice');
  assert.equal(r.json.data.xpGained, 100);
  assert.equal(r.json.data.posMission, 0);
  assert.equal(r.json.data.posQuestion, 1, 'ต้องเลื่อนไปข้อที่ 2');
});

test('ตอบซ้ำข้อเดิม = ไม่นับคะแนนซ้ำ', async () => {
  const r = await answer(0, 'e2e-q1', 1);
  assert.equal(r.json.data.alreadyAnswered, true);
  assert.equal(r.json.data.xpGained, 0);
});

test('ตอบครบด่าน 1 -> ข้ามด่านว่างไปด่าน 2 ข้อแรก', async () => {
  const r = await answer(0, 'e2e-q2', 0);
  assert.equal(r.json.data.correct, true);
  assert.equal(r.json.data.posMission, 2, 'ต้องข้ามด่านว่าง (ด่าน 1) ไปด่าน 2 แต่ได้ posMission=' + r.json.data.posMission);
  assert.equal(r.json.data.posQuestion, 0);
});

test('ตอบครบด่าน 2 -> ไม่มีด่านควิซถัดไป = quizDone', async () => {
  const r = await answer(2, 'e2e-q3', 1);
  assert.equal(r.json.data.correct, true);
  assert.equal(r.json.data.quizDone, true, 'ตอบครบทุกด่านควิซแล้วต้อง quizDone=true');
});

test('เปิดด่านบอส -> ตอบถูก = บอสเสีย 200 HP และเดินหน้า', async () => {
  const s = await put('/api/sessions', { gameId, status: 'boss' });
  ok(s, 'เปิดด่านบอส');

  const r = await answer(3, 'e2e-b1', 0);
  ok(r, 'ตอบบอสข้อ 1');
  assert.equal(r.json.data.correct, true);
  assert.equal(r.json.data.boss, true, 'ต้องระบุว่าเป็นด่านบอส');
  assert.equal(r.json.data.bossHit, true, 'ตอบถูกต้องตีบอส');
  assert.equal(r.json.data.bossHpLeft, 400, '600 - 200 = 400 แต่ได้ ' + r.json.data.bossHpLeft);
  assert.equal(r.json.data.bossPos, 1);
});

test('ตอบบอสผิด = ไม่ตีบอส และยังอยู่ข้อเดิม (ต้องกด "ไปข้อถัดไป")', async () => {
  const r = await answer(3, 'e2e-b2', 0); // ผิด (เฉลยคือ 1)
  ok(r, 'ตอบบอสข้อ 2');
  assert.equal(r.json.data.correct, false);
  assert.equal(r.json.data.bossHit, false, 'ตอบผิดต้องไม่ตีบอส');
  assert.equal(r.json.data.bossHpLeft, 400, 'HP ต้องเท่าเดิม แต่ได้ ' + r.json.data.bossHpLeft);
  assert.equal(r.json.data.bossPos, 1, 'ตอบผิดต้องยังอยู่ข้อเดิม ไม่เดินเอง');
});

test('ตอบซ้ำข้อเดิม (แม้เคยตอบผิด) = ไม่นับใหม่ ไม่ตีบอสเพิ่ม', async () => {
  const r = await answer(3, 'e2e-b2', 1); // คราวนี้ถูก แต่ข้อนี้ตอบไปแล้ว
  assert.equal(r.json.data.alreadyAnswered, true);
  assert.equal(r.json.data.xpGained, 0);
  assert.notEqual(r.json.data.bossHit, true, 'ตอบซ้ำต้องไม่ตีบอส');
});

test('กด "ไปข้อถัดไป" -> เดินหน้าข้ามข้อที่ตอบผิด', async () => {
  const r = await advance();
  ok(r, 'เรียก advance');
  assert.equal(r.json.data.bossPos, 2, 'ต้องขยับจากข้อที่ตอบผิดไปข้อถัดไป');
  assert.equal(r.json.data.bossDone, false);
});

test('ตอบบอสข้อ 3 ถูก -> ตีบอสครั้งที่ 2 (HP 200)', async () => {
  const r = await answer(3, 'e2e-b3', 0);
  assert.equal(r.json.data.correct, true);
  assert.equal(r.json.data.bossHit, true);
  assert.equal(r.json.data.bossHpLeft, 200, 'ตี 2 ครั้ง = 200 แต่ได้ ' + r.json.data.bossHpLeft);
  assert.equal(r.json.data.bossPos, 3);
});

test('ตอบบอสข้อสุดท้ายถูก -> บอสตาย (600-200x3=0) และ bossDone', async () => {
  const r = await answer(3, 'e2e-b4', 0);
  assert.equal(r.json.data.correct, true);
  assert.equal(r.json.data.bossHpLeft, 0, 'ตี 3 ครั้ง = 0 แต่ได้ ' + r.json.data.bossHpLeft);
  assert.equal(r.json.data.bossDone, true, 'ตอบครบ 4 ข้อบอสแล้วต้อง bossDone');
});

test('ตอบครบแล้วสั่งเดินหน้าต่อ = ไม่พัง (ยังอยู่ที่เดิม)', async () => {
  const r = await advance();
  ok(r, 'เรียก advance');
  assert.equal(r.json.data.bossDone, true);
});

test('บอสตาย -> คะแนนเข้าสถิติถาวรของนักเรียน (rollUp)', async () => {
  // ระบบมีช่วงหน่วง 2.5 วินาทีหลังบอสตาย เพื่อรอคำตอบที่ค้างอยู่ให้ถึงก่อนปิดรอบ
  // (GET /api/sessions คือจุดที่เรียก settleBossDefeat)
  let rolled = false;
  for (let i = 0; i < 20 && !rolled; i++) {
    await new Promise((r) => setTimeout(r, 400));
    await pollSessions();
    const s = await findStudent();
    if (s && (s.gamesPlayed || 0) > 0) rolled = true;
  }
  assert.ok(rolled, 'รอสถิตินักเรียนไม่สำเร็จ (บอสควรตายแล้ว)');

  const s = await findStudent();
  assert.equal(s.gamesPlayed, 1, 'เล่นจบ 1 ครั้ง แต่ได้ ' + s.gamesPlayed);
  assert.equal(s.correctAnswers, 6, 'ถูก 6 ข้อ แต่ได้ ' + s.correctAnswers);
  assert.equal(s.totalAnswers, 7, 'ตอบ 7 ครั้ง แต่ได้ ' + s.totalAnswers);
  assert.ok((s.totalXp || 0) >= 600, 'XP สะสมต้องอย่างน้อย 600 แต่ได้ ' + s.totalXp);
});

test('สถิติผู้เล่นถูกต้อง: ตอบถูก 6 / ทั้งหมด 7 (ตอบผิด 1 ครั้ง)', async () => {
  const r = await getPlayer();
  assert.equal(r.data.correctAnswers, 6, 'ถูก 6 ข้อ แต่ได้ ' + r.data.correctAnswers);
  assert.equal(r.data.totalAnswers, 7, 'ทั้งหมด 7 ครั้ง แต่ได้ ' + r.data.totalAnswers);
  assert.ok(r.data.xp >= 600, 'XP ต้องอย่างน้อย 600 แต่ได้ ' + r.data.xp);
});

test('คำตอบของเกมเดิมยังเป็นตัวเลข + kind=choice (เข้ากันได้กับข้อมูลแบบเดิม)', async () => {
  const r = await getPlayer();
  assert.equal(r.data.answers.length, 7);
  for (const a of r.data.answers) {
    assert.equal(a.kind, 'choice', 'คำตอบของเกมเดิมต้องเป็น kind=choice');
    assert.equal(typeof a.selectedAnswer, 'number', 'selectedAnswer ของเกมเดิมต้องเป็นตัวเลข');
    assert.equal(typeof a.correctAnswer, 'number', 'correctAnswer ของเกมเดิมต้องเป็นตัวเลข');
  }
});
