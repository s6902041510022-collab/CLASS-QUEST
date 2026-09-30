// เพิ่มเกมตัวอย่างที่รวมคำถามทั้ง 3 ชนิด (ตัวเลือก / กรอกตัวเลข / จับคู่) ไว้ให้ลองเล่น
//
// ใช้ได้ 2 แบบ ทั้งสองทำงานซ้ำได้ (ไม่สร้างซ้ำถ้ามี id เดิมแล้ว)
//   1) รันตรง ๆ : node data/seed-tasks.mjs   -> เขียนลง data/db.json
//   2) นำเข้า   : applySeedTasks(db)         -> ใช้กับ Redis ผ่าน data/seed-kv.mjs
//
// หมายเหตุ: คำถามแต่ละช่องมี field `kind` บอกชนิด
//   - ไม่มี kind (หรือ 'quiz') = ตัวเลือกแบบเดิม
//   - 'numeric' = กรอกตัวเลข (มี unit ได้)
//   - 'match'   = จับคู่ (มี pairs)
import { readFileSync, writeFileSync } from 'fs';
import { pathToFileURL } from 'url';
import path from 'path';

const DB = path.join(process.cwd(), 'data', 'db.json');

/** รันตรง ๆ ไหม — ถ้า import เข้ามาไม่ต้องเขียนไฟล์ (ใช้แค่ export) */
const isMain = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

const T = '2026-09-30T00:00:00.000Z';

// ---------- ตัวช่วยสร้างคำถาม ----------
const choice = (id, text, options, correctAnswer, explanation) => ({
  id,
  text,
  options,
  correctAnswer,
  explanation,
});

const numeric = (id, text, correctAnswer, unit, explanation) => ({
  id,
  kind: 'numeric',
  text,
  correctAnswer,
  unit: unit || '',
  explanation,
});

const match = (id, text, pairs, explanation) => ({
  id,
  kind: 'match',
  text,
  pairs,
  explanation,
});

const game = {
  id: 'seed-game-4',
  name: 'สามวิธีแก้ปัญหา',
  subject: 'คอมพิวเตอร์',
  topic: 'หน่วยความจำและการวัดข้อมูล',
  description: 'เกมทดสอบคำถาม 3 ชนิด: เลือกตัวเลือก, พิมพ์ตัวเลข, และจับคู่ (แตะทีละคู่)',
  mode: 'solo',
  teamCount: 2,
  timeLimit: 240,
  playerLimit: 40,
  randomEvents: false,
  actionCards: false,
  bossBattle: true,
  leaderboard: true,
  bossName: 'เจ้าตัวเลขมหากาพย์',
  bossHp: 600,
  status: 'draft',
  roomCode: 'QUEST4',
  createdAt: T,
  updatedAt: T,
};

const missions = [
  {
    id: 'seed-g4-m1',
    gameId: 'seed-game-4',
    title: 'ด่านที่ 1: เลือกตอบให้ถูก',
    type: 'quiz',
    xp: 100,
    timeLimit: 60,
    order: 1,
    questions: [
      choice('seed-g4-q1', 'หน่วยความจำใดเร็วที่สุด?', ['RAM', 'SSD', 'HDD', 'Register'], 3,
        'Register อยู่ภายใน CPU จึงเข้าถึงได้เร็วที่สุด แต่จุขนาดเล็กมาก'),
      choice('seed-g4-q2', 'ไฟล์ที่เก็บถาวรและเข้าถึงได้เร็วที่สุดคือ?', ['HDD', 'USB', 'SSD', 'RAM'], 2,
        'SSD เป็นแบบแข็ง ไม่มีชิ้นส่วนเคลื่อนไหว จึงอ่านเร็วและทนทานกว่า'),
    ],
    createdAt: T,
    updatedAt: T,
  },
  {
    id: 'seed-g4-m2',
    gameId: 'seed-game-4',
    title: 'ด่านที่ 2: พิมพ์คำตอบเป็นตัวเลข',
    type: 'quiz',
    xp: 120,
    timeLimit: 90,
    order: 2,
    questions: [
      numeric('seed-g4-q3', '1 KB มีกี่ไบต์?', '1024', 'ไบต์',
        'หน่วยข้อมูลวัดเป็นไบต์ 1 KB = 1024 ไบต์ (1024 ไม่ใช่ 1000)'),
      numeric('seed-g4-q4', 'ถ้ามีข้อมูล 2 GB และ 1 KB = 1024 ไบต์ ข้อมูลทั้งหมดมีกี่ไบต์?', '2097152', 'ไบต์',
        '2 GB = 2 x 1024 MB = 2048 MB และ 2048 x 1024 = 2,097,152 ไบต์'),
      numeric('seed-g4-q5', 'คอมพิวเตอร์ทั่วไปใช้ RAM กี่หน่วย (หน่วยเป็น GB)?', '8 | 8.0 | 8GB', 'GB',
        'คอมพิวเตอร์ในโรงเรียนส่วนใหญ่ใช้ RAM 8 GB (ใส่คำตอบหลายแบบได้โดยคั่นด้วยเครื่องหมาย |)'),
    ],
    createdAt: T,
    updatedAt: T,
  },
  {
    id: 'seed-g4-m3',
    gameId: 'seed-game-4',
    title: 'ด่านที่ 3: จับคู่ (แตะทีละคู่)',
    type: 'quiz',
    xp: 150,
    timeLimit: 120,
    order: 3,
    questions: [
      match('seed-g4-q6', 'จับคู่อุปกรณ์กับหน้าที่ของมัน', [
        { a: 'RAM', b: 'ทำงานเร็ว เก็บข้อมูลชั่วคราว' },
        { a: 'SSD', b: 'เก็บข้อมูลถาวร เข้าถึงเร็ว' },
        { a: 'HDD', b: 'เก็บข้อมูลได้เยอะ ช้ากว่า' },
        { a: 'CPU', b: 'คิดและประมวลผลคำสั่ง' },
      ], 'RAM เป็นหน่วยความจำหลัก, SSD/HDD เป็นที่เก็บข้อมูลถาวร และ CPU เป็นตัวประมวลผล'),
      match('seed-g4-q7', 'จับคู่หน่วยวัดขนาดข้อมูล', [
        { a: 'ไบต์ (Byte)', b: 'ตัวอักษร 1 ตัว' },
        { a: 'กิบะไบต์ (KB)', b: '1024 ไบต์' },
        { a: 'เมกะไบต์ (MB)', b: '1024 กิบะไบต์' },
        { a: 'จิกะไบต์ (GB)', b: '1024 เมกะไบต์' },
      ], 'หน่วยแต่ละขั้นเท่ากับหน่วยก่อนหน้า 1024 เท่า'),
    ],
    createdAt: T,
    updatedAt: T,
  },
  {
    id: 'seed-g4-m4',
    gameId: 'seed-game-4',
    title: 'ด่านบอส: เจ้าตัวเลขมหากาพย์',
    type: 'boss',
    xp: 150,
    timeLimit: 90,
    order: 4,
    questions: [
      choice('seed-g4-b1', 'ถ้าบอสมีพลังชีวิต 600 หน่วย ต้องตีถูกกี่ครั้งจึงจะชนะ?',
        ['2 ครั้ง', '3 ครั้ง', '4 ครั้ง', '6 ครั้ง'], 1,
        'ตอบถูก 1 ครั้ง บอสเสีย 200 หน่วย → 600 หาร 200 = 3 ครั้ง'),
      numeric('seed-g4-b2', 'ถ้าตีบอสถูก 4 ครั้ง บอสจะเสียพลังชีวิตรวมกี่หน่วย?', '800', 'หน่วย',
        'ตอบถูก 1 ครั้ง = เสีย 200 หน่วย → 4 x 200 = 800 หน่วย'),
      match('seed-g4-b3', 'จับคู่ขั้นตอนการบันทึกไฟล์ให้เรียงตามลำดับ', [
        { a: '1. เลือกไฟล์', b: 'คลิกขวาเพื่อเปิดเมนู' },
        { a: '2. กด Save', b: 'ระบบเขียนลงดิสก์' },
        { a: '3. รอสักครู่', b: 'ไฟล์ถูกบันทึกเรียบร้อย' },
      ], 'บันทึกไฟล์คือ เลือกไฟล์ → เปิดเมนู → กด Save → รอระบบเขียนลงดิสก์'),
    ],
    createdAt: T,
    updatedAt: T,
  },
];

/**
 * เติมเกมตัวอย่างชุดนี้ลงในออบเจกต์ฐานข้อมูล (แก้ของเดิม คืนจำนวนที่เพิ่มใหม่)
 * ใช้ร่วมกันได้ทั้งฐานข้อมูลแบบไฟล์และ Redis
 */
export function applySeedTasks(db) {
  const haveGame = new Set(db.games.map((g) => g.id));
  const haveMission = new Set(db.missions.map((m) => m.id));

  const addedGame = !haveGame.has(game.id);
  const addedMissions = missions.filter((m) => !haveMission.has(m.id));

  if (addedGame) db.games.push(game);
  db.missions.push(...addedMissions);

  db.games.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  db.missions.sort(
    (a, b) =>
      a.gameId === b.gameId
        ? (a.order || 0) - (b.order || 0)
        : String(a.gameId).localeCompare(String(b.gameId))
  );

  return {
    addedGame: addedGame ? 1 : 0,
    addedMissions: addedMissions.length,
    missionsTotal: missions.length,
  };
}

// รันตรง ๆ = เขียนลงไฟล์
if (isMain) {
  const db = JSON.parse(readFileSync(DB, 'utf8'));
  const added = applySeedTasks(db);
  writeFileSync(DB, JSON.stringify(db, null, 2), 'utf8');

  console.log(`เกม ${game.id} = ${game.name}`);
  console.log(`เพิ่มด่านใหม่ ${added.addedMissions} ด่าน (ทั้งหมด ${added.missionsTotal} ด่านของเกมนี้)`);
  console.log('missions ทั้งหมดในระบบ:', db.missions.length);
}
