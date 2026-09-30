// ทดสอบว่าครูสองคนแยกข้อมูลกันจริง
// รัน: node --test scripts/api-isolation.test.mjs     (ต้องมี dev server รันอยู่ที่ port 3000)
//
// ทำไมต้องมีไฟล์นี้ และทำไมไม่พอแค่ "อ่านโค้ดดูว่ามีด่านตรวจ"
// ตอนที่ยังใช้ PIN 4 หลักที่ตั้งไว้ทั้งระบบ ทุก /api/* เปิดสาธารณะ
// ทุกคนที่เปิดเว็บได้จึงทำได้ทั้งนี้โดยไม่ต้อง "แฮ็ก" อะไรเลย:
//   - สร้าง/ลบเกมของครูคนอื่น
//   - แก้คะแนนนักเรียนของครูคนอื่น (เพิ่ม XP ได้เท่าที่ต้องการ)
//   - กดหยุดเวลา/จบเกมของห้องอื่น
//   - ดูสถิติของครูทุกคน
//   - นักเรียนของครู A เข้าห้องของครู B ได้
//
// โค้ดที่ผ่านการรีวิวแล้วก็ยังพลาดได้ เพราะที่พลาดมักไม่ใช่ "ไม่มีด่านตรวจ"
// แต่คือ "มีด่านตรวจแต่ไม่ครอบคลุมทุกทาง" — เช่น GET ปิดแต่ DELETE ลืม
// หรือเช็ค ownerId ถูกตัวแต่เอา id จาก request body ซึ่งควบคุมได้เอง
// เทสต์นี้ยิงตามมุมโจมต์จริง ไม่ได้ยิงตามโค้ดที่เขียนไว้
//
// ⚠️ เทสต์นี้สร้างบัญชีครูจริง 2 บัญชี (ชื่อสุ่ม) และลบเกม/นักเรียนที่สร้างทิ้ง
//    ตัวบัญชีค้างไว้ เพราะไม่มี API ลบบัญชี (ถ้ามี ใครก็ยิงลบบัญชีครูทั้งระบบได้)

import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeClient, ok, uniqueName } from './http-client.mjs';

const BASE = process.env.CQ_BASE || 'http://localhost:3000';

/** สมัครครูใหม่ 1 คน พร้อม client ที่ผูกคุกกี้เซสชันแล้ว */
async function newTeacher(label) {
  const client = makeClient(BASE);
  const username = uniqueName(`cq_iso_${label}_`);
  const r = await client.post('/api/auth/register', {
    username,
    password: 'test-password-123',
    name: `ครู${label}`,
  });
  ok(r, `สมัครบัญชีครู${label}`);
  return { client, username, id: r.json.data.id };
}

/** ล็อกอินใหม่ — ต้องมีหลังเทสต์ "ออกจากระบบ" เพราะตอนนั้นเซสชันถูกฆ่าทิ้งจริง */
async function login(who) {
  const r = await who.client.post('/api/auth/login', {
    username: who.username,
    password: 'test-password-123',
  });
  ok(r, `ล็อกอินใหม่ไม่สำเร็จ (${who.username})`);
}

// ข้อมูลตัวอย่างของครูแต่ละคน
let A, B;              // บัญชีครูสองคน
let aGame, aMission, aStudent, aRoomCode;
let bGame, bMission, bStudent, bRoomCode;
let bPlayer;          // ผู้เล่นของครู B (ใช้ทดสอบการยิงแทน)

before(async () => {
  A = await newTeacher('a');
  B = await newTeacher('b');

  const g = await A.client.post('/api/games', { name: 'เกมของครูเอ' });
  ok(g, 'ครูเอสร้างเกม');
  aGame = g.json.data;
  aRoomCode = aGame.roomCode;

  const m = await A.client.post('/api/missions', {
    gameId: aGame.id, type: 'quiz', title: 'ด่านของครูเอ',
    questions: [{ id: 'iso-a1', text: 'คำถามของครูเอ', options: ['x', 'y'], correctAnswer: 0 }],
  });
  ok(m, 'ครูเอสร้างด่าน');
  aMission = m.json.data;

  const s = await A.client.post('/api/students', { name: 'นักเรียนของครูเอ' });
  ok(s, 'ครูเอเพิ่มนักเรียน');
  aStudent = s.json.data;

  const g2 = await B.client.post('/api/games', { name: 'เกมของครูบี' });
  ok(g2, 'ครูบีสร้างเกม');
  bGame = g2.json.data;
  bRoomCode = bGame.roomCode;

  const m2 = await B.client.post('/api/missions', {
    gameId: bGame.id, type: 'quiz', title: 'ด่านของครูบี',
    questions: [{ id: 'iso-b1', text: 'คำถามของครูบี', options: ['x', 'y'], correctAnswer: 0 }],
  });
  ok(m2, 'ครูบีสร้างด่าน');
  bMission = m2.json.data;

  const s2 = await B.client.post('/api/students', { name: 'นักเรียนของครูบี' });
  ok(s2, 'ครูบีเพิ่มนักเรียน');
  bStudent = s2.json.data;

  // นักเรียนของครูบีเข้าห้อง (ผูกกับคุกกี้ของ client คนนี้)
  const joiner = makeClient(BASE);
  const p = await joiner.post('/api/players', { gameId: bGame.id, studentId: bStudent.id });
  ok(p, 'นักเรียนของครูบีเข้าห้อง');
  bPlayer = p.json.data;
});

after(async () => {
  await A.client.del(`/api/players/${bPlayer?.id || ''}`).catch(() => {});
  await A.client.del(`/api/missions/${aMission?.id || ''}`);
  await A.client.del(`/api/missions/${bMission?.id || ''}`).catch(() => {});
  await A.client.del(`/api/games/${aGame?.id || ''}`);
  await A.client.del(`/api/games/${bGame?.id || ''}`).catch(() => {});
  await A.client.del(`/api/students/${aStudent?.id || ''}`);
  await A.client.del(`/api/students/${bStudent?.id || ''}`).catch(() => {});
});

// ==================== รายการเกม ====================

describe('รายการเกมของแต่ละครู', () => {
  test('ครูเอเห็นแต่เกมตัวเอง', async () => {
    const r = await A.client.get('/api/games');
    ok(r, 'อ่านรายการเกม');
    const ids = r.json.data.map((g) => g.id);
    assert.ok(ids.includes(aGame.id), 'ต้องเห็นเกมตัวเอง');
    assert.ok(!ids.includes(bGame.id), '⚠️ ครูเอเห็นเกมของครูบี');
  });

  test('ครูบีเห็นแต่เกมตัวเอง', async () => {
    const r = await B.client.get('/api/games');
    ok(r, 'อ่านรายการเกม');
    const ids = r.json.data.map((g) => g.id);
    assert.ok(ids.includes(bGame.id), 'ต้องเห็นเกมตัวเอง');
    assert.ok(!ids.includes(aGame.id), '⚠️ ครูบีเห็นเกมของครูเอ');
  });

  test('ไม่ล็อกอินไม่เห็นเกมใครทั้งนั้น', async () => {
    const anon = makeClient(BASE);
    const r = await anon.get('/api/games');
    assert.equal(r.status, 401);
  });
});

// ==================== เกมเดียว ====================

describe('เปิด/แก้/ลบเกมของครูอื่น', () => {
  test('เปิดเกมของครูอื่น = 404 (ไม่ใช่ 403)', async () => {
    const r = await B.client.get(`/api/games/${aGame.id}`);
    // 404 ไม่ใช่ 403 เพราะ 403 ยืนยันว่า "มีเกมนี้อยู่จริง"
    // ถ้าตอบ 403 ก็ยืนยันไปแล้วว่า id นี้ใช้ได้ → เอาไปเดา id อื่นต่อได้
    assert.equal(r.status, 404, 'ได้ ' + r.status + ' — ตอบ 403 เท่ากับบอกว่ามีเกมนี้อยู่');
  });

  test('แก้เกมของครูอื่นไม่ได้', async () => {
    const r = await B.client.put(`/api/games/${aGame.id}`, { name: 'ถูกแก้ชื่อโดยครูบี' });
    assert.equal(r.status, 404);
    const back = await A.client.get(`/api/games/${aGame.id}`);
    assert.equal(back.json.data.name, 'เกมของครูเอ', '⚠️ ชื่อเกมถูกแก้จริง');
  });

  test('ลบเกมของครูอื่นไม่ได้', async () => {
    const r = await B.client.del(`/api/games/${aGame.id}`);
    assert.equal(r.status, 404);
    const back = await A.client.get(`/api/games/${aGame.id}`);
    assert.equal(back.json.data?.id, aGame.id, '⚠️ เกมของครูอื่นถูกลบ');
  });

  test('ลบเกมตัวเองได้ (กันเพราะข้างบนบังคับ 404 ทุกเกม)', async () => {
    const g = await A.client.post('/api/games', { name: 'เกมที่จะลบ' });
    ok(g, 'สร้างเกมที่จะลบ');
    const r = await A.client.del(`/api/games/${g.json.data.id}`);
    assert.equal(r.status, 200, 'เจ้าของต้องลบเกมตัวเองได้');
  });
});

// ==================== ด่าน ====================

describe('ด่านของเกมครูอื่น', () => {
  test('อ่านรายการด่านของเกมครูอื่นไม่ได้', async () => {
    const r = await B.client.get(`/api/missions?gameId=${aGame.id}`);
    assert.equal(r.status, 404);
    assert.equal((r.json.data || []).length, 0, '⚠️ เห็นด่านของครูอื่น');
  });

  test('เปิดด่านของครูอื่นไม่ได้', async () => {
    const r = await B.client.get(`/api/missions/${aMission.id}`);
    assert.equal(r.status, 404);
    assert.equal(r.json.data, undefined, '⚠️ อ่านเนื้อหาด่านของครูอื่นได้ (เฉลยด้วย)');
  });

  test('เพิ่มด่านในเกมครูอื่นไม่ได้', async () => {
    const r = await B.client.post('/api/missions', {
      gameId: aGame.id, type: 'quiz', title: 'แฮกเข้าไป',
      questions: [{ id: 'hack', text: '?', options: ['a'], correctAnswer: 0 }],
    });
    assert.equal(r.status, 404);
    const list = await A.client.get(`/api/missions?gameId=${aGame.id}`);
    assert.equal(list.json.data.length, 1, '⚠️ มีด่านแปลกปลอมโผล่มาในเกมของครูเอ');
  });

  test('แก้/ลบด่านของครูอื่นไม่ได้', async () => {
    const up = await B.client.put(`/api/missions/${aMission.id}`, {
      gameId: aGame.id, title: 'ถูกแก้', type: 'quiz', questions: [],
    });
    assert.equal(up.status, 404);

    const rm = await B.client.del(`/api/missions/${aMission.id}`);
    assert.equal(rm.status, 404);

    const back = await A.client.get(`/api/missions/${aMission.id}`);
    assert.equal(back.json.data?.title, 'ด่านของครูเอ', '⚠️ ด่านของครูเอถูกแก้หรือถูกลบ');
  });
});

// ==================== นักเรียน ====================

describe('นักเรียนของครูอื่น', () => {
  test('อ่านรายชื่อได้แค่ของตัวเอง', async () => {
    const mine = await A.client.get('/api/students');
    ok(mine, 'ครูเออ่านรายชื่อ');
    const ids = mine.json.data.map((s) => s.id);
    assert.ok(ids.includes(aStudent.id), 'ต้องเห็นนักเรียนตัวเอง');
    assert.ok(!ids.includes(bStudent.id), '⚠️ ครูเอเห็นนักเรียนของครูบี');
  });

  test('เปิดข้อมูลนักเรียนคนอื่นไม่ได้', async () => {
    const r = await B.client.get(`/api/students/${aStudent.id}`);
    assert.equal(r.status, 404);
  });

  test('แก้คะแนนนักเรียนคนอื่นไม่ได้ (เดิมใครก็ใส่ XP ได้เต็มที่)', async () => {
    const r = await B.client.patch(`/api/students/${aStudent.id}`, { totalXp: 999999 });
    assert.equal(r.status, 404);
    const back = await A.client.get(`/api/students/${aStudent.id}`);
    assert.equal(back.json.data.totalXp, 0, '⚠️ คะแนนนักเรียนครูเอถูกแก้โดยครูบี');
  });

  test('ลบนักเรียนคนอื่นไม่ได้', async () => {
    const r = await B.client.del(`/api/students/${aStudent.id}`);
    assert.equal(r.status, 404);
    const back = await A.client.get(`/api/students/${aStudent.id}`);
    assert.equal(back.json.data?.id, aStudent.id, '⚠️ นักเรียนครูเอถูกลบ');
  });

  test('ส่ง ownerId มาเองก็ย้ายของของคนอื่นไม่ได้', async () => {
    // เคยมีช่องแบบนี้: แม้ route จะเช็คว่าเป็นเจ้าของแล้ว
    // แต่ถ้า updateStudent เอา ownerId จาก updates ทับ ownerId เดิม
    // ก็เท่ากับส่งของของตัวเองไปให้ครูอื่น (หรือกลับกัน)
    const mine = await A.client.get(`/api/students/${aStudent.id}`);
    ok(mine, 'อ่านนักเรียนตัวเอง');
    const up = await A.client.patch(`/api/students/${aStudent.id}`, {
      ownerId: B.id, totalXp: 555,
    });
    if (up.status === 200) {
      const after = await B.client.get(`/api/students/${aStudent.id}`);
      assert.equal(after.status, 404, '⚠️ ส่ง ownerId มาแล้วของเด้งไปหาครูบี (เห็นเป็นของตัวเอง)');
      const back = await A.client.get(`/api/students/${aStudent.id}`);
      assert.equal(back.json.data.ownerId, A.id, '⚠️ เจ้าของถูกเปลี่ยน');
    }
  });
});

// ==================== สถิติ ====================

describe('สถิติของครูอื่น', () => {
  test('ดูสถิติเกมครูอื่นไม่ได้', async () => {
    const r = await B.client.get(`/api/analytics?gameId=${aGame.id}`);
    assert.equal(r.status, 404);
  });

  test('ภาพรวมรวมเฉพาะของตัวเอง', async () => {
    const mine = await B.client.get('/api/analytics');
    ok(mine, 'ครูบีดูภาพรวม');
    const text = JSON.stringify(mine.json);
    assert.ok(!text.includes(aGame.id), '⚠️ สรุปรวมของครูบีมี id เกมของครูเอ');
  });
});

// ==================== ห้องเล่น ====================

describe('ควบคุมห้องของครูอื่น', () => {
  test('หยุดเวลาเกมครูอื่นไม่ได้ (เดิมกดหยุดเวลาใครก็ได้)', async () => {
    const r = await B.client.put('/api/sessions', { gameId: aGame.id, status: 'paused' });
    assert.equal(r.status, 404);
  });

  test('เปิดด่านบอสเกมครูอื่นไม่ได้', async () => {
    const r = await B.client.put('/api/sessions', { gameId: aGame.id, status: 'boss' });
    assert.equal(r.status, 404);
  });

  test('จบเกมของครูอื่นไม่ได้', async () => {
    const r = await B.client.post('/api/sessions', { gameId: aGame.id, force: true, status: 'ended' });
    assert.equal(r.status, 404);
  });

  test('จัดทีมในเกมครูอื่นไม่ได้', async () => {
    const r = await B.client.post('/api/teams', { gameId: aGame.id, teamCount: 4 });
    assert.equal(r.status, 404);
  });

  test('ดูรายชื่อคนในห้องครูอื่นไม่ได้', async () => {
    const r = await B.client.get(`/api/players?gameId=${aGame.id}`);
    // ครูบีไม่ใช่เจ้าของ และก็ไม่ได้เป็นนักเรียนในห้องนั้น → ต้องไม่หลุดข้อมูลออกไป
    //
    // ⚠️ เดิมคาด 404 เป๊ะ แต่ตอนนี้ได้ 401 แทน เพราะแก้ requireOwnedGame
    //    (ซึ่ง "return ทันที" เมื่อไม่ใช่เจ้าของ ซึ่งทำให้ครูที่คุกกี้ค้างอยู่
    //     สลับมาเป็นนักเรียนของห้องอื่นแล้วเข้าเกมไม่ได้เลย) เปลี่ยนเป็น
    //    getOwnedGame + ปล่อยตกไปทางนักเรียน → ครูบีตกไปถึง requirePlayerInGame
    //    ซึ่งตอบ 401 "ยังไม่ได้เข้าห้อง"
    //    ทั้งสองรหัสคือ "ไม่ให้ดู" เหมือนกัน → ยืนยันว่าห้ามหลุดข้อมูล ไม่ใช่ยืนยันว่ารหัสต้องเป็นอะไร
    assert.ok(
      r.status === 404 || r.status === 401,
      `ครูอื่นต้องดูผู้เล่นในห้องนี้ไม่ได้ (ได้ ${r.status})`
    );
    assert.ok(
      !JSON.stringify(r.json).includes(aGame.roomCode),
      '⚠️ ห้ามหลุดข้อมูลห้องของครูอื่นทุกกรณี'
    );
  });
});

// ==================== คุกกี้เซสชันหลุด ====================

describe('คุกกี้เซสชัน', () => {
  test('เลียนแบบคุกกี้ของครูบี (ขโมยมาจากเครื่องครู) แล้วอ่านของครูเอไม่ได้', async () => {
    const stolen = makeClient(BASE);
    stolen.jar.set('cq_session', B.client.jar.get('cq_session'));
    const r = await stolen.get(`/api/games/${aGame.id}`);
    assert.equal(r.status, 404, 'ต้องเห็นเฉพาะของตัวเอง แม้จะใช้คุกกี้ที่ขโมยมาก็ตาม');
  });

  test('ออกจากระบบแล้วใช้คุกกี้เดิมไม่ได้ (ต้องตายที่เซิร์ฟเวอร์ ไม่ใช่แค่ล้างในเบราว์เซอร์)', async () => {
    const token = B.client.jar.get('cq_session');
    const out = makeClient(BASE);
    out.jar.set('cq_session', token);

    const before = await out.get('/api/auth');
    ok(before, 'ก่อนออกจากระบบ ต้องอ่านบัญชีได้');
    assert.equal(before.json.data.username, B.username);

    await out.del('/api/auth');

    // เอาคุกกี้เดิมกลับมาใส่ — ต้องใช้ไม่ได้แล้ว
    const reuse = makeClient(BASE);
    reuse.jar.set('cq_session', token);
    const after = await reuse.get('/api/auth');
    assert.equal(after.json.data, null, '⚠️ โทเคนยังใช้ได้หลังออกจากระบบ — ขโมยคุกกี้ไปใช้ต่อได้');
  });
});

// ==================== ห้องที่นักเรียนเข้าได้ ====================

describe('การเข้าห้องของนักเรียน', () => {
  test('นักเรียนของครูเอ เข้าห้องของครูบีไม่ได้', async () => {
    // เคยเป็นช่องโหว่ตรง ๆ: ส่ง studentId ตัวเอง + gameId คนอื่น → เข้าได้
    const joiner = makeClient(BASE);
    const r = await joiner.post('/api/players', { gameId: bGame.id, studentId: aStudent.id });
    assert.equal(r.status, 404, 'ได้ ' + r.status + ' — นักเรียนข้ามครูได้');
    assert.equal(joiner.jar.get('cq_student'), undefined, '⚠️ ได้คุกกี้ผู้เล่นทั้งที่เข้าไม่ได้');
  });

  test('เข้าห้องด้วย studentId ที่ไม่มีจริงไม่ได้', async () => {
    const joiner = makeClient(BASE);
    const r = await joiner.post('/api/players', { gameId: bGame.id, studentId: 'ไม่มีจริง' });
    assert.equal(r.status, 404);
  });

  test('/api/rooms ห้ามหลุด ownerId (เป็นกุญแจของครู)', async () => {
    const anon = makeClient(BASE);
    const r = await anon.get(`/api/rooms?code=${bRoomCode}`);
    ok(r, 'ค้นหาห้องด้วยรหัสได้ (นักเรียนต้องทำได้ก่อนมีคุกกี้)');
    assert.equal(r.json.data.id, bGame.id, 'ต้องเห็นข้อมูลพอให้เข้าห้อง');
    assert.equal(r.json.data.ownerId, undefined, '⚠️ ownerId หลุดออกไปกับ /api/rooms');
    assert.ok(!JSON.stringify(r.json).includes(B.id), '⚠️ id ครูหลุดไปด้วย');
  });

  test('/api/rooms หาห้องไม่เจอต้องตอบ 404 ไม่ใช่ 200 ว่าง', async () => {
    const anon = makeClient(BASE);
    const r = await anon.get('/api/rooms?code=NOPEXX');
    assert.equal(r.status, 404);
  });
});

// ==================== บัญชี ====================

describe('บัญชีครู', () => {
  test('สมัครชื่อซ้ำไม่ได้ (ไม่งั้นแอบอ้างชื่อคนอื่นได้)', async () => {
    const anon = makeClient(BASE);
    const r = await anon.post('/api/auth/register', {
      username: A.username, password: 'อยากแอบอ้าง', name: 'มือปลอม',
    });
    assert.equal(r.status, 409, 'ได้ ' + r.status + ' (ควรเป็น 409 ชนกัน)');
  });

  test('รหัสผ่านผิดเข้าไม่ได้', async () => {
    const anon = makeClient(BASE);
    const r = await anon.post('/api/auth/login', {
      username: A.username, password: 'เดาสุ่ม',
    });
    assert.equal(r.status, 401);
    assert.equal(anon.jar.get('cq_session'), undefined, '⚠️ ได้คุกกี้แม้รหัสผิด');
  });

  test('ข้อความบอกว่า "รหัสผิด" หรือ "ไม่มีชื่อนี้" ต้องเหมือนกัน (ไม่ให้ไล่เดาชื่อ)', async () => {
    const anon = makeClient(BASE);
    const wrongPass = await anon.post('/api/auth/login', { username: A.username, password: 'ผิด' });
    const noUser = await anon.post('/api/auth/login', { username: 'ไม่มีชื่อนี้แน่นอน', password: 'ผิด' });
    assert.equal(wrongPass.json.error, noUser.json.error, 'ต้องตอบเหมือนกัน ไม่งั้นไล่เดาชื่อที่มีในระบบได้');
  });

  test('ไม่มีรหัสผ่าน/โทเคนหลุดกลับมาในคำตอบใด ๆ (ชื่อผู้ใช้ของตัวเองต้องเห็นได้)', async () => {
    // ครูบีถูกออกจากระบบไปแล้วในชุดก่อนหน้า — ต้องล็อกอินใหม่ก่อน
    await login(B);

    for (const [who, client, mine, other] of [
      ['เอ', A.client, A.username, B.username],
      ['บี', B.client, B.username, A.username],
    ]) {
      const info = await client.get('/api/auth');
      ok(info, `ครู${who} อ่านข้อมูลบัญชีตัวเอง`);
      const text = JSON.stringify(info.json);
      assert.ok(!text.includes('passwordHash'), `⚠️ หลุด passwordHash (ครู${who})`);
      assert.ok(!text.includes('cq_session'), `⚠️ หลุดชื่อคุกกี้เซสชัน (ครู${who})`);
      assert.ok(!text.includes('test-password-123'), `⚠️ หลุดรหัสผ่าน (ครู${who})`);

      // ครูต้องเห็นชื่อผู้ใช้ของตัวเองได้ (หน้าตั้งค่าแสดงให้ดูแบบอ่านอย่างเดียว)
      assert.equal(info.json.data.username, mine, `ครู${who} ต้องเห็นชื่อผู้ใช้ของตัวเอง`);
      // แต่ต้องไม่เห็นชื่อผู้ใช้ของครูอื่น
      assert.ok(!text.includes(other), `⚠️ ครู${who} เห็นชื่อผู้ใช้ของอีกคน`);
    }
  });

  test('เปลี่ยนรหัสผ่านโดยไม่ยืนยันรหัสเดิมไม่ได้', async () => {
    const r = await A.client.post('/api/auth/password', {
      currentPassword: 'เดาไม่ถูก', newPassword: 'รหัสใหม่ที่ใครก็ตั้งได้',
    });
    // 401 = "คุณไม่มีสิทธิ์" (รหัสเดิมผิด) ต่างจาก 400 ที่หมายถึงส่งข้อมูลผิดรูปแบบ
    assert.equal(r.status, 401, 'ได้ ' + r.status);

    // และรหัสเดิมต้องยังใช้ได้อยู่
    const anon = makeClient(BASE);
    const still = await anon.post('/api/auth/login', {
      username: A.username, password: 'test-password-123',
    });
    ok(still, 'รหัสเดิมต้องยังเข้าได้');
  });

  test('รหัสผ่านสั้นเกินไปต้องถูกปฏิเสธ (เดิมรับอะไรก็ได้)', async () => {
    const anon = makeClient(BASE);
    const r = await anon.post('/api/auth/register', {
      username: uniqueName('cq_short_'), password: '123', name: 'รหัสสั้นเกิน',
    });
    assert.equal(r.status, 400, 'รหัส 3 ตัวควรถูกปฏิเสธ');
  });
});
