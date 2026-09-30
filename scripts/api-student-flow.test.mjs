// ทดสอบเส้นทางของนักเรียน — ไม่มีบัญชีครูเลย
// รัน: node --test scripts/api-student-flow.test.mjs   (ต้องมี dev server รันอยู่ที่ port 3000)
//
// ⚠️ ไฟล์นี้มีที่มาจากข้อผิดพลาดจริง ไม่ใช่การเดา
//    ตอนเพิ่มระบบบัญชีครู ทุก /api/students, /api/games/:id, /api/missions
//    ถูกบังคับให้ล็อกอินเป็นครู → นักเรียนเข้าเกมไม่ได้เลย
//    (หน้า /student/join พังตั้งแต่ขั้นโหลดรายชื่อ เพราะยิง GET /api/students ได้ 401)
//
//    เทสต์เดิมไม่จับได้ เพราะเริ่มจาก "ครูเพิ่มนักเรียนเองแล้วยิง POST /api/players"
//    เทสต์ทุกตัวมีคุกกี้ครูติดไปด้วย เลยผ่านตลอดโดยไม่รู้ว่าของจริงพัง
//    → เทสต์นี้ต้องใช้ client ที่ "ไม่มีคุกกี้ cq_session เลย" ตลอดชีวิต
//
// ⚠️ เทสต์นี้สร้างบัญชีครูจริง 1 บัญชี (ชื่อสุ่ม) เพื่อเตรียมเกมตัวอย่าง
//    บัญชีค้างไว้ เพราะไม่มี API ลบบัญชี (data/db.json ถูกสำรอง/คืนโดย scripts/e2e.mjs)

import { test, before, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeClient, ok, assertStatus, uniqueName } from './http-client.mjs';

const BASE = process.env.CQ_BASE || 'http://localhost:3000';

// ⚠️ client นี้ห้ามมี cq_session เด็ดขาด — คือ "คนที่ไม่มีบัญชีครู" ในโลกจริง
const anon = makeClient(BASE);
const teacher = makeClient(BASE);

let game, mission, student, roomCode;

before(async () => {
  const username = uniqueName('cq_stu_');
  const reg = await teacher.post('/api/auth/register', {
    username,
    password: 'test-password-123',
    name: 'ครูเตรียมข้อมูล',
  });
  ok(reg, 'สมัครบัญชีครู');

  const g = await teacher.post('/api/games', { name: 'เกมสำหรับทดสอบนักเรียน' });
  ok(g, 'สร้างเกม');
  game = g.json.data;
  roomCode = game.roomCode;

  const m = await teacher.post('/api/missions', {
    gameId: game.id,
    type: 'quiz',
    title: 'ด่านทดสอบ',
    questions: [
      { id: 'stu-1', text: '2 + 2 ตอบเท่าไร', options: ['3', '4', '5'], correctAnswer: 1 },
    ],
  });
  ok(m, 'สร้างด่าน');
  mission = m.json.data;

  const s = await teacher.post('/api/students', { name: 'นักเรียนทดสอบ' });
  ok(s, 'เพิ่มนักเรียน');
  student = s.json.data;
});

describe('นักเรียนเข้าเกมได้โดยไม่ต้องมีบัญชีครู', () => {
  test('ค้นหาห้องจากรหัสห้องได้ และไม่เห็น ownerId', async () => {
    const r = await anon.get(`/api/rooms?code=${roomCode}`);
    ok(r, 'ค้นหาห้องด้วยรหัสห้อง');
    assert.equal(r.json.data.id, game.id, 'ได้เกมตัวที่ถูก');
    assert.ok(!('ownerId' in r.json.data), 'ห้องห้องต้องไม่หลุด ownerId ของครู');
  });

  test('ดูรายชื่อในห้องได้ด้วยรหัสห้อง (ก่อนเข้าห้อง ยังไม่มีคุกกี้ผู้เล่น)', async () => {
    const r = await anon.get(
      `/api/students?gameId=${game.id}&roomCode=${roomCode}`
    );
    ok(r, 'นักเรียนดูรายชื่อในห้องได้');
    assert.ok(
      r.json.data.some((s) => s.id === student.id),
      'ต้องเห็นชื่อที่ครูลงไว้'
    );
  });

  test('รหัสห้องผิดห้อง → ดูรายชื่อไม่ได้', async () => {
    const r = await anon.get(`/api/students?gameId=${game.id}&roomCode=ZZZZZZ`);
    assertStatus(r, [404], 'รหัสห้องไม่ตรงกับ gameId');
  });

  test('ไม่มีรหัสห้องเลย → ไม่ให้ดูรายชื่อใคร', async () => {
    const r = await anon.get(`/api/students?gameId=${game.id}`);
    assertStatus(r, [400], 'ไม่ส่งรหัสห้องมา');
  });

  test('เพิ่มชื่อใหม่เข้าห้องได้ด้วยรหัสห้อง', async () => {
    const r = await anon.post('/api/students', {
      name: `นักเรียนใหม่${Date.now().toString(36)}`,
      gameId: game.id,
      roomCode,
    });
    assertStatus(r, [201], 'เพิ่มชื่อใหม่ได้');
    assert.equal(r.json.data.name.startsWith('นักเรียนใหม่'), true);
  });

  test('เข้าห้อง (POST /api/players) ได้ แล้วตั้งคุกกี้ผู้เล่นให้เอง', async () => {
    const r = await anon.post('/api/players', { gameId: game.id, studentId: student.id });
    ok(r, 'เข้าห้องได้');
    assert.ok(r.json.data.id, 'ต้องได้ id ผู้เล่นกลับมา');
    assert.ok(anon.cookies.cq_student, 'ต้องตั้งคุกกี้ cq_student ให้นักเรียน');
  });

  test('เข้าห้องแล้วอ่านเกมของห้องตัวเองได้', async () => {
    const r = await anon.get(`/api/games/${game.id}`);
    ok(r, 'อ่านข้อมูลเกมได้');
    assert.ok(!('ownerId' in r.json.data), 'นักเรียนต้องไม่เห็น ownerId');
  });

  test('อ่านภารกิจได้ แต่ต้องไม่เห็นเฉลย', async () => {
    const r = await anon.get(`/api/missions?gameId=${game.id}`);
    ok(r, 'อ่านภารกิจได้');
    const q = r.json.data[0].questions[0];
    assert.equal(q.text, '2 + 2 ตอบเท่าไร', 'ต้องได้โจทย์เพื่อเล่น');
    assert.deepEqual(q.options, ['3', '4', '5'], 'ต้องได้ตัวเลือก');
    assert.ok(!('correctAnswer' in q), 'ห้ามส่งเฉลยให้นักเรียนก่อนตอบ');
  });

  test('อ่านข้อมูลตัวเองได้ (หน้าล็อบี้ + หน้าผลของฉัน)', async () => {
    const r = await anon.get(`/api/students/${student.id}`);
    ok(r, 'นักเรียนอ่านข้อมูลตัวเองได้');
    assert.equal(r.json.data.id, student.id);
  });

  test('อ่านข้อมูลนักเรียนคนอื่นไม่ได้ (ผ่านคุกกี้ผู้เล่นของตัวเอง)', async () => {
    const other = await teacher.post('/api/students', { name: 'คนอื่นที่ไม่เกี่ยวข้อง' });
    ok(other, 'สร้างนักเรียนอีกคน (เป็นของครูคนเดียวกัน)');
    const r = await anon.get(`/api/students/${other.json.data.id}`);
    assertStatus(r, [404], 'นักเรียนอ่านข้อมูลของคนอื่นไม่ได้');
  });

  test('ตอบคำถามได้ และเฉลยกลับมาในคำตอบ (ไม่ต้องดูเฉลยล่วงหน้า)', async () => {
    // เริ่มรอบก่อน ไม่งั้น /api/answers จะไม่รับ
    const sess = await teacher.post('/api/sessions', { gameId: game.id, force: true });
    ok(sess, 'ครูเริ่มรอบเล่น');

    const r = await anon.post('/api/answers', {
      playerId: anon.cookies.cq_student,
      gameId: game.id,
      missionId: mission.id,
      questionId: 'stu-1',
      selectedAnswer: 1,
      timeTakenSec: 5,
    });
    ok(r, 'ตอบคำถามได้');
    assert.equal(r.json.data.correct, true, 'ตอบถูก');
    assert.equal(r.json.data.correctAnswer, 1, 'เฉลยต้องมาตอนตอบเสร็จ ไม่ใช่ตอนโหลดภารกิจ');
  });
});

describe('นักเรียนเข้าถึงเกมห้องอื่นไม่ได้', () => {
  let otherGame, otherRoom;

  before(async () => {
    // ⚠️ ต้องใช้ client แยก — ถ้าใช้ตัวเดียวกับ teacher คุกกี้ cq_session
    //    จะถูกล็อกอินทับ แล้วท้ายไฟล์ครูเดิมกลายเป็นคนอื่นจนอ่านของตัวเองไม่ได้
    const c2 = makeClient(BASE);
    const username = uniqueName('cq_stu2_');
    const reg = await c2.post('/api/auth/register', {
      username,
      password: 'test-password-123',
      name: 'ครูอีกคน',
    });
    ok(reg, 'สมัครบัญชีครูอีกคน');
    const g = await c2.post('/api/games', { name: 'เกมของครูอีกคน' });
    ok(g, 'สร้างเกมของครูอีกคน');
    otherGame = g.json.data;
    otherRoom = otherGame.roomCode;
  });

  test('อ่านเกมที่ยังไม่ได้เข้าห้องไม่ได้', async () => {
    const r = await anon.get(`/api/games/${otherGame.id}`);
    assertStatus(r, [404], 'อ่านเกมของห้องอื่นไม่ได้');
  });

  test('อ่านภารกิจของห้องอื่นไม่ได้', async () => {
    const r = await anon.get(`/api/missions?gameId=${otherGame.id}`);
    assertStatus(r, [404], 'อ่านภารกิจของห้องอื่นไม่ได้');
  });

  test('เอารหัสห้องของห้องอื่นมาดูรายชื่อห้องนี้ไม่ได้', async () => {
    const r = await anon.get(`/api/students?gameId=${game.id}&roomCode=${otherRoom}`);
    assertStatus(r, [404], 'รหัสห้องไม่ตรงกับเกม');
  });
});

describe('เข้าห้องตอนรอบเก่าปิดไปแล้ว ต้องรอครูเริ่มใหม่ ไม่ใช่โดนพาไปดูผลวิเคราะห์', () => {
  // ⚠️ มาจากข้อผิดพลาดจริง: นักเรียนเลือกชื่อแล้วถูกดันไปหน้าผลวิเคราะห์ทันที
  //    เพราะ getSession คืน "รอบล่าสุด" แม้ปิดไปแล้ว → หน้าล็อบี้เห็น completed ก็พาไป /student/me
  //    แก้ชื่อแล้วเข้าใหม่ก็โดนซ้ำ เพราะรอบเก่ายังค้างสถานะ completed
  const late = makeClient(BASE);
  const late2 = makeClient(BASE);
  let lateGameId;
  let lateStudent;

  before(async () => {
    // ⚠️ ใช้ client แยก เพราะถ้าล็อกอินทับ teacher ท้ายไฟล์ครูเดิมอ่านของตัวเองไม่ได้
    const username = uniqueName('cq_late_');
    const reg = await late.post('/api/auth/register', {
      username,
      password: 'test-password-123',
      name: 'ครูรอบที่สอง',
    });
    ok(reg, 'สมัครบัญชีครูรอบที่สอง');

    const g = await late.post('/api/games', { name: 'เกมที่เล่นไปแล้ว' });
    ok(g, 'สร้างเกม');
    lateGameId = g.json.data.id;

    const m = await late.post('/api/missions', {
      gameId: lateGameId,
      type: 'quiz',
      title: 'ด่านเดียว',
      questions: [{ id: 'late-1', text: 'ข้อเดียว', options: ['x', 'y'], correctAnswer: 0 }],
    });
    ok(m, 'สร้างด่าน');

    const s = await late.post('/api/students', { name: 'นักเรียนมาเข้าช้า' });
    ok(s, 'เพิ่มนักเรียน');
    lateStudent = s.json.data;

    // รอบที่ 1: เล่นจนจบ (ครูกดจบเกม)
    await late.post('/api/sessions', { gameId: lateGameId, force: true });
    const end = await late.put('/api/sessions', { gameId: lateGameId, status: 'completed' });
    ok(end, 'ครูจบรอบที่ 1');

    const st = await late.get(`/api/sessions?gameId=${lateGameId}`);
    ok(st, 'อ่านสถานะรอบที่ 1');
    assert.equal(st.json.data.status, 'completed', 'รอบที่ 1 ต้องปิดแล้ว');
  });

  test('นักเรียนที่เข้ามาหลังรอบปิด ต้องถูกพาไปห้องรอ ไม่ใช่รอบที่ตาย', async () => {
    const p = await late2.post('/api/players', {
      gameId: lateGameId,
      studentId: lateStudent.id,
    });
    ok(p, 'เข้าห้องได้');

    const sess = await late2.get(`/api/sessions?gameId=${lateGameId}`);
    ok(sess, 'นักเรียนอ่านสถานะห้องได้');
    assert.notEqual(
      sess.json.data.status,
      'completed',
      'ห้องรอต้องไม่ใช่รอบที่ปิดแล้ว ไม่งั้นหน้าล็อบี้จะพาไปหน้าผลวิเคราะห์ทันที'
    );
    assert.equal(sess.json.data.status, 'lobby', 'ต้องเป็นห้องรอ');
  });

  test('นักเรียนคนที่สองเข้าตามมาได้ห้องรอเดียวกัน (ไม่เพิ่มรอบเปล่า)', async () => {
    const before = await late2.get(`/api/sessions?gameId=${lateGameId}`);
    const waitingId = before.json.data.id;

    const s2 = await late.post('/api/students', { name: 'คนที่สอง' });
    ok(s2, 'เพิ่มนักเรียนคนที่สอง');
    const other = makeClient(BASE);
    const p2 = await other.post('/api/players', {
      gameId: lateGameId,
      studentId: s2.json.data.id,
    });
    ok(p2, 'คนที่สองเข้าห้อง');

    const after = await late2.get(`/api/sessions?gameId=${lateGameId}`);
    assert.equal(after.json.data.id, waitingId, 'ต้องได้ห้องรอเดียวกัน ไม่ใช่เปิดห้องใหม่ทุกคน');
  });

  test('ถ้านักเรียนกลับมาเปลี่ยนชื่อ (เข้าห้องใหม่) ก็ยังรออยู่ ไม่ถูกดันไปดูผลวิเคราะห์', async () => {
    const other = makeClient(BASE);
    const renamed = await late.post('/api/students', { name: 'ชื่อใหม่' });
    ok(renamed, 'สร้างชื่อใหม่');

    const p = await other.post('/api/players', {
      gameId: lateGameId,
      studentId: renamed.json.data.id,
    });
    ok(p, 'เข้าห้องด้วยชื่อใหม่');

    const sess = await other.get(`/api/sessions?gameId=${lateGameId}`);
    assert.equal(
      sess.json.data.status,
      'lobby',
      'ต้องยังรอครูเริ่มอยู่ ไม่ใช่ถูกพาไปหน้าผลวิเคราะห์'
    );
  });
});

describe('ครูยังเห็นข้อมูลเต็มตามเดิม', () => {
  test('ครูอ่านภารกิจแล้วเห็นเฉลย', async () => {
    const r = await teacher.get(`/api/missions?gameId=${game.id}`);
    ok(r, 'ครูอ่านภารกิจได้');
    assert.equal(r.json.data[0].questions[0].correctAnswer, 1, 'ครูต้องเห็นเฉลย');
  });

  test('ครูอ่านรายชื่อได้โดยไม่ต้องส่งรหัสห้อง', async () => {
    const r = await teacher.get('/api/students');
    ok(r, 'ครูอ่านรายชื่อได้');
    assert.ok(Array.isArray(r.json.data) && r.json.data.length > 0);
  });

  test('ครูเพิ่มรายชื่อเป็นชุดได้ (นักเรียนทำไม่ได้)', async () => {
    const r = await teacher.post('/api/students', { names: ['ก', 'ข', 'ค'] });
    ok(r, 'ครูเพิ่มรายชื่อเป็นชุดได้');
    assert.equal(r.json.count, 3);
  });
});

describe('ครูที่ยังล็อกอินค้างอยู่ แล้วสลับมาเป็นนักเรียนของห้องคนอื่น', () => {
  // ⚠️ มาจากข้อผิดพลาดจริงที่เจอตอนทดสอบด้วยเบราว์เซอร์
  //
  //   สถานการณ์จริง: ครูทดสอบฝั่งนักเรียนบนเครื่องตัวเอง (หรือเครื่องคลาสที่มีครูคนอื่นล็อกอินทิ้งไว้)
  //   → คุกกี้ cq_session ของครูยังติดอยู่ แต่กำลังทำตัวเป็นนักเรียนของห้องอีกห้อง
  //
  //   โค้ดเดิมเช็ค "มีคุกกี้ครูไหม" → ถ้ามี ให้เข้าทางครูทันที ไม่สนว่าเกมเป็นของครูคนนั้นหรือเปล่า
  //   ผลคือ (ทั้ง 3 จุด พังพร้อมกัน แล้วหน้าเว็บเงียบไปเฉย ๆ ไม่บอกอะไรเลย):
  //     GET /api/students?gameId=  → รายชื่อว่างเปล่า  ("ไม่พบชื่อที่ค้นหา")
  //     GET /api/players?gameId=   → "ยังไม่มีใครเข้าร่วม" ทั้งที่เพิ่งเข้ามาเอง
  //     GET /api/students/:id      → 404 ชื่อตัวเองหายไปจากหน้าล็อบี้
  //   แก้โดย: ต้องเช็ค "เป็นเจ้าของจริงไหม" ไม่ใช่แค่ "เป็นครูไหม" แล้วปล่อยตกไปทางนักเรียน
  const mix = makeClient(BASE);
  let joined;

  before(async () => {
    // ⚠️ ใช้ client แยก: การสมัคร/ล็อกอินบน teacher เดิมจะทับคุกกี้ครูท้ายไฟล์
    const reg = await mix.post('/api/auth/register', {
      username: uniqueName('cq_mix_'),
      password: 'test-password-123',
      name: 'ครูคนที่สอง',
    });
    ok(reg, 'สมัครบัญชีครูคนที่สอง');
    assert.ok(mix.cookies.cq_session, 'ต้องมีคุกกี้ครูติดอยู่');

    // ตอนนี้สลับมาเป็นนักเรียนของห้องของครูคนแรก (cq_session ยังไม่ถูกลบ)
    const p = await mix.post('/api/players', { gameId: game.id, studentId: student.id });
    ok(p, 'เข้าห้องของครูคนแรกในฐานะนักเรียน');
    joined = p.json.data;
    assert.ok(mix.cookies.cq_student, 'ต้องได้คุกกี้ผู้เล่น');
    assert.ok(mix.cookies.cq_session, 'คุกกี้ครูยังต้องอยู่ (นี่คือหัวใจของเคสนี้)');
  });

  test('คุกกี้ครูค้างอยู่ รายชื่อในห้องก็ยังต้องเห็น (ไม่ใช่รายชื่อของครูคนนี้)', async () => {
    const r = await mix.get(`/api/students?gameId=${game.id}&roomCode=${roomCode}`);
    ok(r, 'ดูรายชื่อในห้องได้แม้คุกกี้ครูยังติดอยู่');
    assert.ok(
      r.json.data.some((s) => s.id === student.id),
      'ต้องเห็นนักเรียนของห้องนี้ ไม่ใช่รายชื่อว่างของครูคนที่สอง'
    );
  });

  test('คุกกี้ครูค้างอยู่ ต้องเห็นผู้เล่นในห้องตัวเอง (ไม่ใช่ "ยังไม่มีใครเข้าร่วม")', async () => {
    const r = await mix.get(`/api/players?gameId=${game.id}`);
    ok(r, 'อ่านผู้เล่นในห้องได้แม้คุกกี้ครูยังติดอยู่');
    assert.ok(
      r.json.data.some((p) => p.id === joined.id),
      'ต้องเห็นตัวเองในรายชื่อผู้เล่น'
    );
  });

  test('คุกกี้ครูค้างอยู่ ยังอ่านชื่อตัวเองได้ (ไม่ใช่ 404)', async () => {
    const r = await mix.get(`/api/students/${student.id}`);
    ok(r, 'อ่านข้อมูลตัวเองได้แม้คุกกี้ครูยังติดอยู่');
    assert.equal(r.json.data.id, student.id, 'ต้องได้ชื่อของตัวเอง');
    assert.ok(
      !r.json.history,
      'ฝั่งนักเรียนไม่ควรได้ประวัติของครู (มีแต่เจ้าของเกมที่ได้)'
    );
  });

  test('คุกกี้ครูค้างอยู่ ยังตอบข้อแทนตัวเองได้ตามปกติ', async () => {
    const r = await mix.post('/api/answers', {
      playerId: joined.id,
      gameId: game.id,
      missionId: mission.id,
      questionId: 'stu-1',
      selectedAnswer: 1,
      timeTakenSec: 3,
    });
    ok(r, 'ตอบข้อสำเร็จแม้คุกกี้ครูยังติดอยู่');
    assert.equal(r.json.data.correct, true, 'ตอบถูก');
  });

  // ── ฝั่งความปลอดภัย: การปล่อยตกทางนักเรียนต้องไม่ทำให้รั่วข้อมูลครูคนอื่น
  test('ครูที่ไม่ได้อยู่ในห้อง ยังอ่านข้อมูลห้องนั้นไม่ได้เหมือนเดิม', async () => {
    const other = makeClient(BASE);
    const reg = await other.post('/api/auth/register', {
      username: uniqueName('cq_out_'),
      password: 'test-password-123',
      name: 'ครูคนที่สาม',
    });
    ok(reg, 'สมัครบัญชีครูคนที่สาม');

    assertStatus(await other.get(`/api/games/${game.id}`), [404], 'อ่านเกมครูอื่นไม่ได้');
    // 401 = "ยังไม่ได้เข้าห้อง", 404 = "ไม่ใช่ของคุณ" — สองอย่างนี้ถือว่าถูกต้องเท่ากัน
    // ของสำคัญคือห้ามหลุดข้อมูลออกไป ไม่ใช่ว่าตอบรหัสไหน
    assertStatus(
      await other.get(`/api/players?gameId=${game.id}`),
      [401, 404],
      'อ่านผู้เล่นครูอื่นไม่ได้'
    );
    assertStatus(await other.get('/api/students'), [200], 'ครูอ่านรายชื่อของตัวเองได้');
    const mineOnly = await other.get('/api/students');
    assert.equal(
      mineOnly.json.data.length,
      0,
      'ครูคนที่สามต้องเห็นแต่รายชื่อของตัวเอง (ยังไม่ได้เพิ่มใคร)'
    );
    assertStatus(
      await other.get(`/api/students?gameId=${game.id}`),
      [400],
      'ครูที่ระบุ gameId ของคนอื่นแต่ไม่มีรหัสห้อง ต้องไม่ผ่าน'
    );
  });
});
