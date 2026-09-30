// ทดสอบชนิดคำถามใหม่ (กรอกตัวเลข / จับคู่) แบบ end-to-end ผ่าน API จริง
// รัน: node --test scripts/e2e-tasks.test.mjs     (ต้องมี dev server รันอยู่ที่ port 3000)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const BASE = 'http://localhost:3000';
let gameId = '';
let playerId = '';
let studentId = '';
let missionIds = []; // [0]=choice, [1]=numeric, [2]=match, [3]=boss

const req = async (url, method, body) => {
  const r = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: r.status, json: await r.json() };
};
const post = (url, body) => req(url, 'POST', body);
const put = (url, body) => req(url, 'PUT', body);
const del = async (url) => fetch(BASE + url, { method: 'DELETE' });
const ok = (res, what) =>
  assert.ok(res.status === 200 || res.status === 201, what + ': ' + JSON.stringify(res.json));

before(async () => {
  const g = await post('/api/games', {
    name: 'E2E tasks test',
    subject: 'ทดสอบ',
    topic: 'ทดสอบ',
    roomCode: 'E2ETSK',
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
      gameId, type: 'quiz', title: 'ด่านตัวเลือก', xp: 100, timeLimit: 60, order: 1,
      questions: [
        { id: 't-c1', text: 'RAM เร็วกว่า HDD ไหม?', options: ['เร็วกว่า', 'ช้ากว่า'], correctAnswer: 0, explanation: 'RAM เร็วกว่า' },
      ],
    },
    {
      gameId, type: 'quiz', title: 'ด่านตัวเลข', xp: 100, timeLimit: 60, order: 2,
      questions: [
        { id: 't-n1', kind: 'numeric', text: '1 KB กี่ไบต์?', correctAnswer: '1024', unit: 'ไบต์', explanation: '1024' },
        { id: 't-n2', kind: 'numeric', text: 'ยอมรับหลายคำตอบ?', correctAnswer: '8 | 8.0', unit: 'GB', explanation: '8' },
      ],
    },
    {
      gameId, type: 'quiz', title: 'ด่านจับคู่', xp: 100, timeLimit: 60, order: 3,
      questions: [
        {
          id: 't-m1', kind: 'match', text: 'จับคู่หน่วยความจำ', explanation: 'RAM เร็ว, SSD เก็บถาวร',
          pairs: [
            { a: 'RAM', b: 'เร็ว' },
            { a: 'SSD', b: 'เก็บถาวร' },
            { a: 'HDD', b: 'เยอะ' },
          ],
        },
      ],
    },
    {
      gameId, type: 'boss', title: 'บอส', xp: 100, timeLimit: 60, order: 4,
      questions: [
        { id: 't-b1', kind: 'numeric', text: 'ตีถูกกี่ครั้งถึงชนะ?', correctAnswer: '3', unit: 'ครั้ง', explanation: '600/200' },
        { id: 't-b2', kind: 'match', text: 'จับคู่ก่อนตีบอส', explanation: 'A->1, B->2',
          pairs: [
            { a: 'A', b: '1' },
            { a: 'B', b: '2' },
          ],
        },
        { id: 't-b3', text: 'ข้อสุดท้าย', options: ['x', 'y'], correctAnswer: 0, explanation: '' },
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

  const st = await post('/api/students', { name: 'นักเรียนทดสอบ E2E Tasks', avatar: '🧪' });
  ok(st, 'สร้างนักเรียนทดสอบไม่สำเร็จ');
  studentId = st.json.data.id;

  const p = await post('/api/players', { gameId, studentId });
  ok(p, 'สร้าง player ไม่สำเร็จ');
  playerId = p.json.data.id;
});

after(async () => {
  if (playerId) await del('/api/players/' + playerId);
  for (const id of missionIds) await del('/api/missions/' + id);
  if (gameId) await del('/api/games/' + gameId);
  if (studentId) await del('/api/students/' + studentId);
});

const getPlayer = () => fetch(`${BASE}/api/players?id=${playerId}`).then((x) => x.json());
const answer = (missionIdx, questionId, selectedAnswer) =>
  post('/api/answers', { playerId, gameId, missionId: missionIds[missionIdx], questionId, selectedAnswer, timeTakenSec: 5 });

// ---------- choice ยังทำงานเหมือนเดิม และเดินต่อได้ ----------

test('ชนิดตัวเลือก: ตอบถูก เดินต่อไปด่านถัดไป', async () => {
  const r = await answer(0, 't-c1', 0);
  ok(r, 'ตอบข้อตัวเลือก');
  assert.equal(r.json.data.correct, true);
  assert.equal(r.json.data.kind, 'choice');
  assert.equal(r.json.data.posMission, 1, 'ต้องเดินไปด่านตัวเลข');
  assert.equal(r.json.data.posQuestion, 0);
});

// ---------- numeric ----------

test('numeric: ตอบด้วยเลขเปล่า = ถูก', async () => {
  const r = await answer(1, 't-n1', 1024);
  ok(r, 'ตอบข้อตัวเลข');
  assert.equal(r.json.data.correct, true);
  assert.equal(r.json.data.kind, 'numeric');
  assert.equal(r.json.data.xpGained, 100);
  assert.equal(r.json.data.posQuestion, 1);
});

test('numeric: ตอบผิด -> ไม่เดินหน้า และบอกเฉลยพร้อมหน่วย', async () => {
  const r = await answer(1, 't-n2', 16);
  ok(r, 'ตอบข้อที่ 2 ผิด');
  assert.equal(r.json.data.correct, false);
  assert.equal(r.json.data.xpGained, 0);
  assert.equal(r.json.data.posQuestion, 1, 'ตอบผิดต้องยังอยู่ข้อเดิม');
  assert.equal(r.json.data.correctAnswer, '8 | 8.0');
  assert.equal(r.json.data.explanation, '8');
});

// ---------- match ----------

test('match: ข้ามข้อผิดด้วยปุ่ม "ไปข้อถัดไป" แล้วจับคู่ถูก = ผ่านด่าน', async () => {
  const adv = await post('/api/players/advance', { playerId });
  ok(adv, 'เลื่อนข้อ');
  assert.equal(adv.json.data.posMission, 2, 'ต้องเข้าด่านจับคู่');
  assert.equal(adv.json.data.quizDone, false);

  const r = await answer(2, 't-m1', [0, 1, 2]);
  ok(r, 'ตอบข้อจับคู่');
  assert.equal(r.json.data.correct, true, 'จับคู่ถูกต้องทุกคู่');
  assert.equal(r.json.data.kind, 'match');
  assert.equal(r.json.data.quizDone, true, 'ตอบครบทุกด่านควิซแล้ว');
});

// ---------- boss ที่มีทั้ง 3 ชนิด ----------

test('บอส: ตอบ numeric ถูก = ตีบอส 200 HP', async () => {
  const s = await put('/api/sessions', { gameId, status: 'boss' });
  ok(s, 'เปิดด่านบอส');

  const r = await answer(3, 't-b1', '3 ครั้ง'); // มีหน่วยปน — ต้องยังถือว่าถูก
  ok(r, 'ตอบบอสข้อ 1');
  assert.equal(r.json.data.correct, true, 'ระบบตัดหน่วยท้ายให้');
  assert.equal(r.json.data.bossHit, true);
  assert.equal(r.json.data.bossHpLeft, 400, '600-200=400 แต่ได้ ' + r.json.data.bossHpLeft);
});

test('บอส: จับคู่ผิด = ไม่ตีบอส และ HP ไม่ลด', async () => {
  const r = await answer(3, 't-b2', [1, 0]); // สลับผิด
  ok(r, 'ตอบบอสข้อ 2 ผิด');
  assert.equal(r.json.data.correct, false, 'สลับ 1 คู่ = ผิด');
  assert.equal(r.json.data.bossHit, false);
  assert.equal(r.json.data.bossHpLeft, 400, 'HP ต้องยัง 400');
});

test('บอส: กดไปข้อถัดไป แล้วตอบ choice ถูก = บอสตาย', async () => {
  const adv = await post('/api/players/advance', { playerId });
  ok(adv, 'เลื่อนข้อบอส');
  assert.equal(adv.json.data.bossPos, 2, 'ข้ามข้อจับคู่ที่ตอบผิด');

  const r = await answer(3, 't-b3', 0);
  assert.equal(r.json.data.correct, true);
  assert.equal(r.json.data.bossHpLeft, 200, 'ตี 2 ครั้ง = 200 แต่ได้ ' + r.json.data.bossHpLeft);
  assert.equal(r.json.data.bossDone, true);
});

// ---------- analytics ต้องอ่านชนิดใหม่ได้ ----------

test('analytics: คืน kind และสรุปคำตอบที่พบบ่อยของชนิดใหม่', async () => {
  const r = await fetch(`${BASE}/api/analytics?gameId=${gameId}`).then((x) => x.json());
  assert.equal(r.success, true);
  const qs = r.data.questions || [];
  const byId = new Map(qs.map((q) => [q.questionId, q]));

  const n1 = byId.get('t-n1');
  assert.equal(n1.kind, 'numeric', 'ต้องบอกว่าเป็น numeric');
  assert.equal(n1.correctLabel, '1024 ไบต์', 'เฉลยต้องมีหน่วย');
  assert.equal(n1.optionTally.length, 0, 'ชนิดตัวเลขไม่มีตัวเลือกให้นับ');
  assert.equal(n1.answerTally[0].label, '1024 ไบต์', 'ต้องเห็นว่านักเรียนตอบอะไร');
  assert.equal(n1.answerTally[0].count, 1);

  const m1 = byId.get('t-m1');
  assert.equal(m1.kind, 'match');
  assert.equal(m1.correctLabel, 'RAM → เร็ว, SSD → เก็บถาวร, HDD → เยอะ');
  assert.equal(m1.answerTally[0].label, 'จับคู่ถูกครบ 3 คู่');

  const c1 = byId.get('t-c1');
  assert.equal(c1.kind, 'choice');
  assert.equal(c1.optionTally.length, 2, 'ชนิดตัวเลือกยังนับทีละ index เห���ือนเดิม');
  assert.equal(c1.answerTally.length, 0);
});

// ---------- ข้อมูลที่บันทึกไว้ต้องอ่านกลับได้ ----------

test('คำตอบที่บันทึก: เก็บ kind ถูกชนิด และเก็บค่าตามที่นักเรียนส่งมา', async () => {
  const r = await getPlayer();
  const byQ = new Map(r.data.answers.map((a) => [a.questionId, a]));

  const c = byQ.get('t-c1');
  assert.equal(c.kind, 'choice');
  assert.equal(typeof c.selectedAnswer, 'number', 'ตัวเลือกเก็บเป็นตัวเลข index');

  // ส่งมาเป็นเลข -> เก็บเป็นเลข (ตัดหน่วย/ลูกน้ำคั่นตอนตรวจ ไม่ได้แก้ข้อมูลที่เด็กพิมพ์)
  const n = byQ.get('t-n1');
  assert.equal(n.kind, 'numeric');
  assert.equal(n.selectedAnswer, 1024, 'เก็บตามที่ส่งมา');

  // ส่งมาเป็นข้อความ (เด็กพิมพ์เอง) -> เก็บข้อความตามที่พิมพ์ เพื่อให้ครูเห็นว่าเด็กพิมพ์อะไร
  const bn = byQ.get('t-b1');
  assert.equal(bn.kind, 'numeric');
  assert.equal(bn.selectedAnswer, '3 ครั้ง', 'เก็บข้อความที่เด็กพิมพ์ไว้ให้ครูดู');

  const m = byQ.get('t-m1');
  assert.equal(m.kind, 'match');
  assert.ok(Array.isArray(m.selectedAnswer), 'จับคู่เก็บเป็น array');
  assert.deepEqual(m.selectedAnswer, [0, 1, 2]);

  // 7 ครั้ง: ถูก 5 (ตัวเลือก, ตัวเลข, จับคู่, บอสตัวเลข, บอสตัวเลือก) + ผิด 2 (ตัวเลข, บอสจับคู่)
  assert.equal(r.data.answers.length, 7, 'ตอบ 7 ครั้ง แต่ได้ ' + r.data.answers.length);
  assert.equal(r.data.correctAnswers, 5, 'ถูก 5 ครั้ง แต่ได้ ' + r.data.correctAnswers);
});

// ---------- แก้ไขด่านแล้วต้องบันทึกจริง (PUT) ----------

test('แก้ไขด่านแล้วบันทึกได้จริง: คู่จับคู่/ตัวเลือก/หน่วย ต้องไม่หาย', async () => {
  // ด่านจับคู่ — แก้ค่าในคู่ แล้วอ่านกลับ
  const cur = await fetch(`${BASE}/api/missions/${missionIds[2]}`).then((x) => x.json());
  const pairs = cur.data.questions[0].pairs.map((p) => ({ a: p.a, b: p.b }));
  pairs[0].b = 'แก้แล้ว-ฝั่งขวา';
  pairs.push({ a: 'คู่ใหม่', b: 'ของใหม่' });

  const up = await put(`/api/missions/${missionIds[2]}`, {
    gameId, title: cur.data.title, type: cur.data.type,
    xp: cur.data.xp, timeLimit: cur.data.timeLimit,
    questions: [{ ...cur.data.questions[0], pairs }],
  });
  ok(up, 'บันทึกด่านจับคู่ไม่สำเร็จ');

  const back = await fetch(`${BASE}/api/missions/${missionIds[2]}`).then((x) => x.json());
  assert.equal(back.data.questions[0].pairs[0].b, 'แก้แล้ว-ฝั่งขวา', 'แก้คู่เดิมต้องอยู่');
  assert.equal(back.data.questions[0].pairs.length, 4, 'เพิ่มคู่ใหม่ต้องอยู่ (ได้ ' + back.data.questions[0].pairs.length + ')');
  assert.equal(back.data.questions[0].pairs[3].a, 'คู่ใหม่');

  // ด่านตัวเลข — แก้คำตอบถูก + หน่วย
  const nCur = await fetch(`${BASE}/api/missions/${missionIds[1]}`).then((x) => x.json());
  const nUp = await put(`/api/missions/${missionIds[1]}`, {
    gameId, title: nCur.data.title, type: nCur.data.type,
    xp: nCur.data.xp, timeLimit: nCur.data.timeLimit,
    questions: nCur.data.questions.map((q, i) =>
      i === 0 ? { ...q, correctAnswer: '2048', unit: 'ไบต์ใหม่' } : q
    ),
  });
  ok(nUp, 'บันทึกด่านตัวเลขไม่สำเร็จ');
  const nBack = await fetch(`${BASE}/api/missions/${missionIds[1]}`).then((x) => x.json());
  assert.equal(nBack.data.questions[0].correctAnswer, '2048', 'แก้คำตอบถูกต้องต้องอยู่');
  assert.equal(nBack.data.questions[0].unit, 'ไบต์ใหม่', 'แก้หน่วยต้องอยู่');
  assert.equal(nBack.data.questions[1].correctAnswer, '8 | 8.0', 'ข้อที่ไม่ได้แก้ต้องไม่หาย');

  // ด่านตัวเลือก — แก้ตัวเลือก + เฉลย
  const cCur = await fetch(`${BASE}/api/missions/${missionIds[0]}`).then((x) => x.json());
  const cUp = await put(`/api/missions/${missionIds[0]}`, {
    gameId, title: cCur.data.title, type: cCur.data.type,
    xp: cCur.data.xp, timeLimit: cCur.data.timeLimit,
    questions: [{ ...cCur.data.questions[0], options: ['แก้1', 'แก้2', 'แก้3'], correctAnswer: 2 }],
  });
  ok(cUp, 'บันทึกด่านตัวเลือกไม่สำเร็จ');
  const cBack = await fetch(`${BASE}/api/missions/${missionIds[0]}`).then((x) => x.json());
  assert.deepEqual(cBack.data.questions[0].options, ['แก้1', 'แก้2', 'แก้3']);
  assert.equal(cBack.data.questions[0].correctAnswer, 2);
});
