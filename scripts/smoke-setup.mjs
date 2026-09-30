// เตรียมข้อมูลสำหรับทดสอบหน้าเว็บจริงด้วยเบราว์เซอร์
// สร้างครู 1 คน + เกม 2 อัน แล้วพิมพ์ roomCode ทั้งสองห้อง + ข้อมูลล็อกอินของครู
//
//   - fresh:  ห้องใหม่ ไม่เคยเล่น (ครูยังไม่เริ่ม) → นักเรียนต้องรอปกติ
//   - played: เล่นรอบแรกจบไปแล้ว (สถานะ completed) → ⚠️ กรณีที่เคยพัง:
//            นักเรียนเลือกชื่อแล้วถูกดันไปหน้าผลวิเคราะห์ทันที
//            หลังแก้แล้วต้องรอครูใหม่เหมือนกัน
//   - started: เปิดเข้าถามข้อแรกแล้ว → ใช้ทดสอบหน้าเล่น/คะแนน
//
// ใช้ตอนเดียว: node scripts/smoke-setup.mjs   (ต้องมี dev server รันที่ port 3000)
import { makeClient, ok, uniqueName } from './http-client.mjs';

const BASE = process.env.CQ_BASE || 'http://localhost:3000';
const PASSWORD = 'test-password-123';

const t = makeClient(BASE);
const username = uniqueName('cq_smoke_');
const reg = await t.post('/api/auth/register', {
  username,
  password: PASSWORD,
  name: 'ครูทดสอบหน้าเว็บ',
});
ok(reg, 'สมัครบัญชีครู');

const questions = [
  { id: 'sm-1', text: '2 + 2 ตอบเท่าไร', options: ['3', '4', '5'], correctAnswer: 1, explanation: '2+2 = 4' },
  { id: 'sm-2', text: 'เมืองหลวงของไทยคือที่ไหน', options: ['เชียงใหม่', 'กรุงเทพฯ', 'ภูเก็ต'], correctAnswer: 1, explanation: 'กรุงเทพมหานคร' },
];

/** @param {'fresh'|'played'|'started'} mode */
async function makeGame(name, mode) {
  const g = await t.post('/api/games', { name });
  ok(g, `สร้างเกม ${name}`);

  const m = await t.post('/api/missions', {
    gameId: g.json.data.id,
    type: 'quiz',
    title: `ด่านของ ${name}`,
    timeLimit: 60,
    questions,
  });
  ok(m, `สร้างด่านของ ${name}`);

  const s = await t.post('/api/students', { name: `นักเรียน${mode}`, avatar: '🐼' });
  ok(s, `เพิ่มนักเรียนของ ${name}`);

  if (mode !== 'fresh') {
    const start = await t.post('/api/sessions', { gameId: g.json.data.id, force: true });
    ok(start, `เริ่มรอบของ ${name}`);
  }
  if (mode === 'played') {
    const end = await t.put('/api/sessions', { gameId: g.json.data.id, status: 'completed' });
    ok(end, `จบรอบของ ${name}`);
  }
  if (mode === 'started') {
    const q = await t.put('/api/sessions', {
      gameId: g.json.data.id,
      status: 'question',
      missionIndex: 0,
      questionIndex: 0,
    });
    ok(q, `เปิดคำถามข้อแรกของ ${name}`);
  }

  return {
    roomCode: g.json.data.roomCode,
    gameId: g.json.data.id,
    missionId: m.json.data.id,
    studentId: s.json.data.id,
    studentName: s.json.data.name,
  };
}

const fresh = await makeGame('ห้องใหม่ยังไม่เริ่ม', 'fresh');
const played = await makeGame('ห้องที่เล่นจบรอบแรกแล้ว', 'played');
const started = await makeGame('ห้องที่ครูเริ่มแล้ว', 'started');

console.log(
  JSON.stringify({ teacher: { username, password: PASSWORD }, fresh, played, started }, null, 2)
);