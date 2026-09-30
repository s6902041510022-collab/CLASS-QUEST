// เติมเกมตัวอย่างลง Redis (Vercel KV / Upstash REST)
//
// ทำไมต้องมีไฟล์นี้
// - ตอน deploy บน Vercel ระบบใช้ Redis ไม่ใช่ไฟล์ (ดู src/lib/db.ts)
// - แต่สคริปต์ seed เดิมเขียนลง data/db.json ซึ่งบน Vercel เขียนไม่ได้ (read-only)
// - ผลคือถ้า deploy ใหม่ Redis จะมีแต่เกมตั้งต้นจาก db.default.json = 1 เกม
//   เกมตัวอย่างทั้งหมด (รวมเกมที่โชว์คำถาม 3 ชนิด) ไม่ไปถึงเซิร์ฟเวอร์
//
// ใช้: ตั้ง KV_REST_API_URL + KV_REST_API_TOKEN แล้วรัน
//      npm run seed:kv
// ทำงานซ้ำได้ (ไม่สร้างข้อมูลซ้ำถ้ามี id เดิมแล้ว) จึงปลอดภัยที่จะรันบ่อย ๆ
//
// ⚠️ ต้องใช้ Node ที่ strip TypeScript ได้เอง (Node 24) — ดู engines ใน package.json
//    เพราะสคริปต์นี้เรียกตัวช่วยของแอป (seed-*.mjs) ผ่าน import ปกติ
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';
import path from 'path';
import { applySeedGames } from './seed-games.mjs';
import { applySeedTasks } from './seed-tasks.mjs';

const URL_ = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;
const KEY = process.env.KV_DB_KEY || 'classquest:db';

if (!URL_ || !TOKEN) {
  console.error('ยังไม่ได้ตั้ง KV_REST_API_URL และ KV_REST_API_TOKEN — สคริปต์นี้เขียนลง Redis เท่านั้น');
  console.error('ถ้าจะเติมข้อมูลในเครื่องตัวเอง (data/db.json) ใช้ npm run seed แทน');
  process.exit(1);
}

/** คำสั่ง Redis แบบ Upstash REST — ส่ง JSON array ไปแล้วได้ { result } หรือ { error } */
async function kv(command) {
  const res = await fetch(URL_, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Redis ตอบกลับ ${res.status} ${res.statusText}`);
  const json = await res.json();
  if (json?.error) throw new Error(`Redis: ${json.error}`);
  return json.result;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * ล็อกแบบเดียวกับ src/lib/db.ts — กันไม่ให้เขียนทับตอนมีคนเล่นอยู่
 * คนล็อกไว้นานเกินกำหนดจะถูกปล่อยให้อัตโนมัติ (ต้องไม่ค้างถาวรจนกว่าจะ redeploy)
 */
async function withLock(fn) {
  const lockKey = `${KEY}:lock`;
  const token = randomUUID();
  for (let attempt = 0; attempt < 40; attempt++) {
    const got = await kv(['SET', lockKey, token, 'NX', 'PX', 15000]).catch(() => null);
    if (got === 'OK') {
      try {
        return await fn();
      } finally {
        if ((await kv(['GET', lockKey]).catch(() => null)) === token) {
          await kv(['DEL', lockKey]).catch(() => null);
        }
      }
    }
    await sleep(50 + attempt * 25);
  }
  console.warn('รอล็อกนานเกินไป — เขียนต่อแม้ไม่ได้ล็อก');
  return fn();
}

await withLock(async () => {
  const raw = await kv(['GET', KEY]);
  const fromDefault = !raw;

  // ยังไม่มีข้อมูลใน Redis = ครั้งแรก เริ่มจาก db.default.json (ไฟล์นี้อยู่ใน git อ่านได้ทุกที่)
  const db = JSON.parse(fromDefault ? readFileSync(path.join(process.cwd(), 'data', 'db.default.json'), 'utf8') : raw);
  if (fromDefault) console.log('Redis ยังว่าง — เริ่มจาก data/db.default.json');

  // ข้อมูลเก่าอาจไม่มีคีย์ที่ครบ เติมให้ครบก่อนเติมเกมตัวอย่าง
  for (const key of ['games', 'missions', 'students', 'players', 'teams', 'groups', 'sessions', 'teachers']) {
    if (!Array.isArray(db[key])) db[key] = [];
  }

  const a = applySeedGames(db);
  const b = applySeedTasks(db);

  await kv(['SET', KEY, JSON.stringify(db)]);

  console.log(`เติมเกมตัวอย่างลง Redis (${KEY}) เรียบร้อย`);
  console.log(`  seed-games: เพิ่ม ${a.addedGames} เกม / ${a.addedMissions} ด่าน`);
  console.log(`  seed-tasks: เพิ่ม ${b.addedGame} เกม / ${b.addedMissions} ด่าน`);
  console.log(`  ตอนนี้มี ${db.games.length} เกม / ${db.missions.length} ด่าน`);
  console.log('');
  console.log('games:');
  for (const g of db.games) console.log(`  ${g.id.padEnd(14)} ${g.name}  [${g.mode}]`);
});
