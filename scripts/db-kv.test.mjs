// ทดสอบฝั่ง Redis (kvBackend) — โหมดที่ต้องใช้ตอน deploy บน Vercel
//
// ทำไมต้องมีไฟล์นี้
// - ฝั่ง Redis เดิมไม่เคยมีเทสต์มาแตะเลย เพราะต้องมี Redis ของจริง
//   ผลคือบั๊กในโค้ด Redis จะไม่มีวันโผล่จนกว่าจะ deploy แล้วล็อกอินไม่ได้
// - ใช้ mock ที่เลียนแบบ Upstash REST (ดู scripts/mock-upstash.mjs)
//   ทำให้ทดสอบฝั่งนี้ได้ในเครื่อง และใน CI โดยไม่ต้องต่อของจริง
//
// ⚠️ ไฟล์นี้ import '../src/lib/db.ts' ตรง ๆ ต้องใช้ Node ที่ strip
//    TypeScript ได้เอง (Node 24) ดู engines ใน package.json
//
// รัน: node --test scripts/db-kv.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startMockUpstash } from './mock-upstash.mjs';

const KEY = 'cq:test:db';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** id ของครูเจ้าของข้อมูลในเทสต์ — ทุกฟังก์ชันที่แตะข้อมูลครูต้องส่งค่านี้ */
const OWNER = 'test-teacher-1';

let mock;
let db;
/** ผลของการโหลดครั้งแรก — ต้องเก็บไว้ก่อนมีการเขียนใด ๆ */
let firstLoad;

before(async () => {
  mock = await startMockUpstash();
  // ต้องตั้ง env ก่อน import เพราะ db.ts อ่านค่านี้ตอนโหลดโมดูล
  process.env.KV_REST_API_URL = mock.url;
  process.env.KV_REST_API_TOKEN = 'test-token';
  process.env.KV_DB_KEY = KEY;

  db = await import('../src/lib/db.ts');

  // โหลดครั้งแรก (ยังไม่เคยเขียนอะไร)
  firstLoad = await db.getDb();
});

after(async () => {
  await mock.close();
});

test('ตั้ง env ครบแล้วเลือกใช้ Redis', () => {
  assert.equal(db.usingKv, true, 'ควรใช้ Redis เมื่อมี KV_REST_API_URL + KV_REST_API_TOKEN');
  assert.match(db.storeLabel, /Redis/, `ควรบอกว่าใช้ Redis แต่ได้ "${db.storeLabel}"`);
});

test('โหมด Redis ไม่ต้องเขียนดิสก์ (ต่างจากโหมดไฟล์ที่พังบน Vercel)', async () => {
  const perm = await db.storeWritable();
  assert.equal(perm.writable, true, 'โหมด Redis ต้องไม่ต้องพึ่งดิสก์');
});

test('ครั้งแรกอ่านค่าตั้งต้นจาก data/db.default.json แล้วยังไม่เขียนลง Redis', () => {
  // เกมตั้งต้นมี 1 เกม (demo-game-1) — ที่มาคือไฟล์ในรีโป ไม่ใช่ Redis
  assert.equal(firstLoad.data.games.length, 1);
  assert.equal(firstLoad.data.games[0].id, 'demo-game-1');
  assert.equal(
    mock.peek(KEY),
    null,
    'การอ่านครั้งแรกต้องไม่เขียนอะไรลง Redis (เขียนตอน read คือบั๊ก)'
  );
});

test('เขียนแล้วอ่านกลับได้จริงใน Redis', async () => {
  const game = await db.createGame(
    {
      name: 'เกมทดสอบ Redis',
      status: 'draft',
      mode: 'solo',
      timeLimit: 60,
      playerLimit: 40,
    },
    OWNER
  );
  assert.ok(game?.id, 'ต้องได้ id เกมกลับมา');
  assert.equal(game.ownerId, OWNER, 'เกมต้องผูกกับเจ้าของเสมอ');

  // ข้อมูลต้องอยู่ใน Redis จริง ไม่ใช่แค่ในหน่วยความจำ
  // (createGame สร้าง roomCode ให้เอง เลยอ้างค่าที่ได้คืนมาแทนที่จะกำหนดเอง)
  const raw = mock.peek(KEY);
  assert.ok(raw, 'ต้องมีข้อมูลถูกเขียนลง Redis');
  assert.ok(raw.includes(game.id), 'ข้อมูลใน Redis ต้องมีเกมที่เพิ่งสร้าง');

  const games = await db.getAllGames(OWNER);
  assert.ok(games.some((g) => g.id === game.id), 'อ่านกลับต้องเจอเกมใหม่');
});

test('PIN ไม่มีแล้ว — ระบบเข้าด้วยบัญชีเท่านั้น', () => {
  // ถ้า verifyPin ยังอยู่ แปลว่ามีทางเข้าระบบที่ไม่ผูกกับบัญชีใด ๆ
  // ซึ่งทำให้รหัสผ่านหลุดครั้งเดียว = เข้าได้ทั้งระบบ และเจ้าของข้อมูลจะไม่ถูกบันทึก
  assert.equal(db.verifyPin, undefined, 'ต้องไม่มีฟังก์ชันยืนยัน PIN เหลืออยู่');
});

test('ใช้ล็อกแบบกระจายตอนเขียน (SET ... NX ... PX)', () => {
  // withLock ใช้ SET NX PX — ถ้าหายไป แปลว่าไม่ได้ล็อก แล้วเขียนชนกันได้
  const locking = mock.calls.filter(
    (c) => c[0] === 'SET' && c.includes('NX') && c.includes('PX')
  );
  assert.ok(locking.length > 0, 'ไม่พบคำสั่งล็อกเลย — withLock อาจไม่ถูกเรียก');
});

test('เขียนพร้อมกันสองทาง ข้อมูลต้องไม่หาย', async () => {
  const before2 = (await db.getAllGames(OWNER)).length;

  // สองคนกดสร้างเกมพร้อมกัน — mergeValue ต้องรวมงานทั้งสองคนไว้
  const [a, b] = await Promise.all([
    db.createGame({ name: 'พร้อมกัน A', status: 'draft', mode: 'solo' }, OWNER),
    db.createGame({ name: 'พร้อมกัน B', status: 'draft', mode: 'solo' }, OWNER),
  ]);

  const after2 = await db.getAllGames(OWNER);
  assert.ok(after2.some((g) => g.id === a.id), 'เกม A หายไป');
  assert.ok(after2.some((g) => g.id === b.id), 'เกม B หายไป');
  assert.equal(after2.length, before2 + 2, 'ต้องเพิ่มขึ้น 2 เกม');
});

// ---------------- บัญชีครู + แยกข้อมูลตามเจ้าของ ----------------
// เดิมเข้าสู่ระบบด้วย PIN 4 หลักที่ตั้งไว้ทั้งระบบ ทำให้ทุกคนเข้าได้ด้วยรหัสเดียว
// และเห็นข้อมูลคนอื่นทั้งหมด ตอนนี้เป็นบัญชีต่อคน + เจ้าของข้อมูล

test('สมัครบัญชีได้ และรหัสผ่านไม่ถูกเก็บเป็นข้อความธรรมดา', async () => {
  const account = await db.registerAccount({
    username: 'KruTest',
    password: 'secret123',
    name: 'คุณครูทดสอบ',
  });

  assert.equal(account.username, 'krutest', 'ชื่อผู้ใช้ต้องถูกทำเป็นตัวพิมพ์เล็ก เพื่อไม่ให้ "A" กับ "a" เป็นคนละบัญชี');
  assert.ok(account.passwordHash, 'ต้องมี hash');
  assert.ok(
    !account.passwordHash.includes('secret123'),
    'รหัสผ่านดิบต้องไม่ปรากฏในข้อมูลที่เก็บ — ถ้าฐานข้อมูลหลุด ใครก็เข้าเป็นครูได้'
  );

  // ชื่อผู้ใช้ซ้ำต้องสมัครไม่ได้ ไม่งั้นคนที่ 2 แอบอ้างชื่อคนแรกได้
  await assert.rejects(
    () => db.registerAccount({ username: 'krutest', password: 'x123456', name: 'ซ้ำ' }),
    /ถูกใช้ไปแล้ว/
  );
});

test('ผู้สมัครคนแรกได้ของเดิมที่ยังไม่มีเจ้าของมาเป็นของตัวเอง', async () => {
  // ของเดิมในระบบ (ตอนยังใช้ PIN) ไม่มีเจ้าของ
  // ถ้าไม่ยกให้คนแรก ข้อมูลที่ครูทำไว้ก่อนหน้านี้จะกลายเป็นของใครก็ได้
  // หรือมองไม่เห็นเลย — ซึ่งแย่กว่าการหายไป เพราะยังนำกลับมาไม่ได้
  const seeded = JSON.parse(readFileSync(path.join(ROOT, 'data', 'db.default.json'), 'utf8'));
  const seededGameIds = seeded.games.map((g) => g.id);

  assert.ok(seededGameIds.length > 0, 'ไฟล์ตั้งต้นต้องมีเกมให้ทดสอบการรับมรดก');
  assert.ok(
    seededGameIds.every((g) => !seeded.games.find((x) => x.id === g).ownerId),
    'ไฟล์ตั้งต้นต้องไม่มีเจ้าของอยู่แล้ว ไม่งั้นเทสต์นี้ทดสอบผิดสิ่ง'
  );

  const account = await db.getAccountByUsername('krutest');
  const data = (await db.getDb()).data;

  for (const id of seededGameIds) {
    const game = data.games.find((g) => g.id === id);
    assert.ok(game, `เกมเดิม ${id} หายไป`);
    assert.equal(game.ownerId, account.id, '⚠️ เกมที่ไม่มีเจ้าของต้องตกแก่ผู้สมัครคนแรก');
  }
  assert.ok(
    data.students.every((s) => !s.ownerId || s.ownerId === account.id),
    '⚠️ นักเรียนที่ไม่มีเจ้าของต้องตกแก่ผู้สมัครคนแรก'
  );

  // ผู้สมัครคนที่สองต้องไม่ได้ของเดิมไปด้วย
  const second = await db.registerAccount({
    username: 'second',
    password: 'second12345',
    name: 'คนที่สอง',
  });
  assert.equal(
    (await db.getAllGames(second.id)).length,
    0,
    '⚠️ ผู้สมัครคนที่สองต้องไม่ได้ของเดิมไป'
  );
});

test('เข้าสู่ระบบผ่าน และรหัสผิดต้องเข้าไม่ได้', async () => {
  const ok = await db.authenticate('krutest', 'secret123');
  assert.equal(ok?.name, 'คุณครูทดสอบ');

  assert.equal(await db.authenticate('krutest', 'ผิด'), null, 'รหัสผิดต้องไม่ผ่าน');
  assert.equal(await db.authenticate('ไม่มี', 'secret123'), null, 'ไม่มีชื่อนี้ต้องไม่ผ่าน');
});

test('เปลี่ยนรหัสผ่านต้องยืนยันรหัสเดิมก่อน', async () => {
  const account = await db.getAccountByUsername('krutest');

  const wrong = await db.updateAccountPassword(account.id, 'ไม่ใช่รหัสเดิม', 'ใหม่123');
  assert.equal(wrong.ok, false, 'รหัสเดิมผิดต้องเปลี่ยนไม่ได้');
  assert.ok(
    await db.authenticate('krutest', 'secret123'),
    'เปลี่ยนไม่สำเร็จ รหัสเดิมต้องยังใช้ได้อยู่'
  );

  const ok = await db.updateAccountPassword(account.id, 'secret123', 'ใหม่12345');
  assert.equal(ok.ok, true);
  assert.ok(await db.authenticate('krutest', 'ใหม่12345'), 'ต้องเข้าด้วยรหัสใหม่');
  assert.equal(await db.authenticate('krutest', 'secret123'), null, 'รหัสเก่าต้องใช้ไม่ได้แล้ว');
});

test('แก้ชื่อ/รูปครูได้ โดยไม่กระทบรหัสผ่าน', async () => {
  const account = await db.getAccountByUsername('krutest');
  const updated = await db.updateAccountProfile(account.id, { name: 'ชื่อใหม่', avatar: '🦊' });

  assert.equal(updated.name, 'ชื่อใหม่');
  assert.equal(updated.avatar, '🦊');
  assert.equal(updated.passwordHash, account.passwordHash, '⚠️ แก้ชื่อแล้วรหัสผ่านต้องไม่เปลี่ยน');

  // ชื่อที่แสดงในเกนกับบัญชีที่เข้าสู่ระบบเป็นคนละเรื่องกัน
  assert.ok(await db.authenticate('krutest', 'ใหม่12345'), 'แก้ชื่อแล้วต้องยังเข้าสู่ระบบได้');
});

test('เซสชันหมดอายุแล้วใช้ไม่ได้', async () => {
  const account = await db.getAccountByUsername('krutest');
  const token = await db.createAuthSession(account.id);
  assert.equal((await db.getAccountByToken(token))?.id, account.id, 'เซสชันใหม่ต้องใช้ได้');

  await db.deleteAuthSession(token);
  assert.equal(await db.getAccountByToken(token), null, 'ออกจากระบบแล้วใช้ไม่ได้');
  assert.equal(await db.getAccountByToken(undefined), null);
});

test('ครูสองคนล็อกอินพร้อมกัน ต้องไม่เด้งออกจากระบบใครเลย', async () => {
  // ชุดนี้จับบั๊กที่เคยเกิดจริง: authSessions เป็นอาร์เรย์ของรายการที่ "ไม่มี id"
  // ทำให้ mergeValue ต้องเทียบทั้งก้อน แล้วฝั่งที่เขียนทีหลังทับเซสชันของอีกคนทิ้ง
  // อาการคือครูสมัครเสร็จกดต่อทันทีแต่โดนบอกว่ายังไม่ได้ล็อกอิน
  // (เจอตอนรันเทสต์ E2E ที่รัน 3 ไฟล์พร้อมกัน — ซึ่งเกิดได้จริงบน Vercel เช่นกัน
  //  เพราะแต่ละคำขอได้ lambda ของตัวเอง)
  const teacherA = await db.registerAccount({
    username: 'crash_a', password: 'secret123', name: 'ครู A',
  });
  const teacherB = await db.registerAccount({
    username: 'crash_b', password: 'secret123', name: 'ครู B',
  });

  const [tokenA, tokenB] = await Promise.all([
    db.createAuthSession(teacherA.id),
    db.createAuthSession(teacherB.id),
  ]);

  assert.ok(tokenA && tokenA !== tokenB, 'ต้องได้โทเคนคนละอัน');

  // ดูของที่ "บันทึกลง Redis จริง" ไม่ใช่ค่าที่ค้างใน cache 2 วินาที
  // เพราะเรื่องนี้พังตอนเขียนทับ — ค่าในหน่วยความจำอาจดูดีทั้งที่ของจริงหาย
  const stored = JSON.parse(mock.peek(KEY));
  const tokens = (stored.authSessions || []).map((s) => s.token);
  assert.ok(tokens.includes(tokenA), '⚠️ เซสชันของครู A หายไปจาก Redis (ถูกเขียนทับตอนครู B ล็อกอิน)');
  assert.ok(tokens.includes(tokenB), '⚠️ เซสชันของครู B หายไปจาก Redis');

  // และต้องใช้ได้จริงหลัง cache หมดอายุ (ตรงกับเคสครูสมัครเสร็จแล้วกดต่อทันที)
  await new Promise((r) => setTimeout(r, 2100));
  assert.equal((await db.getAccountByToken(tokenA))?.id, teacherA.id);
  assert.equal((await db.getAccountByToken(tokenB))?.id, teacherB.id);
});

test('ครูคนหนึ่งเห็นแต่เกมของตัวเอง ไม่เห็นของครูอีกคน', async () => {
  const other = await db.registerAccount({
    username: 'other',
    password: 'other12345',
    name: 'ครูอีกคน',
  });
  const mine = await db.getAccountByUsername('krutest');

  const myGame = await db.createGame({ name: 'เกมของฉัน' }, mine.id);
  const theirGame = await db.createGame({ name: 'เกมของเขา' }, other.id);

  const mineList = await db.getAllGames(mine.id);
  assert.ok(mineList.some((g) => g.id === myGame.id), 'ต้องเห็นเกมตัวเอง');
  assert.ok(
    !mineList.some((g) => g.id === theirGame.id),
    '⚠️ ต้องไม่เห็นเกมครูอื่น — ไม่งั้นครูลบหรือแก้เกมคนอื่นได้'
  );

  // ระดับเกมเดียว: ขอของคนอื่นต้องได้ null ไม่ใช่ "403"
  // เพราะการตอบ 403 ยืนยันว่าเกมนี้มีอยู่จริง → ใช้ยิง id ไปเรื่อย ๆ สำรวจระบบได้
  assert.equal(await db.getOwnedGame(theirGame.id, mine.id), null, 'ต้องไม่เห็นเกมคนอื่น');
  assert.ok(await db.getOwnedGame(myGame.id, mine.id), 'ต้องเห็นเกมตัวเอง');

  // และลบ/แก้ของคนอื่นต้องไม่มีผล
  assert.equal(await db.deleteGame(theirGame.id, mine.id), false, '⚠️ ลบเกมคนอื่นไม่ได้');
  assert.ok(await db.getGame(theirGame.id), 'เกมคนอื่นต้องยังอยู่');
});

test('ภารกิจของเกมคนอื่นอ่านไม่ได้ (เดินทางผ่านเจ้าของเกม)', async () => {
  const mine = await db.getAccountByUsername('krutest');
  const other = await db.getAccountByUsername('other');
  const theirGame = (await db.getAllGames(other.id))[0];

  const mission = await db.createMission(
    { gameId: theirGame.id, title: 'ด่านของครูอื่น', questions: [] },
    other.id
  );
  assert.ok(mission, 'ครูเจ้าของต้องสร้างภารกิจได้');

  assert.equal(
    (await db.getMissions(theirGame.id, mine.id)).length,
    0,
    '⚠️ ครูอื่นต้องมองภารกิจนี้ไม่เห็น'
  );
  assert.equal((await db.getMissions(theirGame.id, other.id)).length, 1, 'เจ้าของต้องเห็น');
  assert.equal(await db.getMission(mission.id, mine.id), null, 'เปิดภารกิจของคนอื่นไม่ได้');

  assert.equal(
    await db.createMission({ gameId: theirGame.id, title: 'แฮก' }, mine.id),
    null,
    '⚠️ เพิ่มภารกิจในเกมคนอื่นไม่ได้'
  );
});

test('นักเรียนชื่อเดียวกันของคนละครูไม่ชนกัน และข้ามบัญชีไม่ได้', async () => {
  const mine = await db.getAccountByUsername('krutest');
  const other = await db.getAccountByUsername('other');

  const a = await db.addStudent('โต๊ะที่ 1', mine.id);
  const b = await db.addStudent('โต๊ะที่ 1', other.id);
  assert.notEqual(a.id, b.id, 'ต้องเป็นคนละรายการ แม้ชื่อเหมือนกัน');

  // ครูคนแรกที่สมัครจะได้ของเดิมที่ยังไม่มีเจ้าของมาเป็นของตัวเอง (ดูเทสต์ "ผู้สมัครคนแรก")
  // เลยเทียบกับ "ของตัวเองทั้งหมด" แทนการนับเป็น 1
  const myStudents = await db.getStudents(mine.id);
  assert.ok(
    myStudents.length > 0 && myStudents.every((s) => s.ownerId === mine.id),
    '⚠️ ครูต้องเห็นแต่นักเรียนตัวเอง'
  );
  assert.ok(
    !myStudents.some((s) => s.id === b.id),
    '⚠️ ครูต้องไม่เห็นนักเรียนของครูอื่น'
  );
  assert.equal(await db.getStudent(b.id, mine.id), null, '⚠️ เปิดข้อมูลนักเรียนคนอื่นไม่ได้');
  // ⚠️ ต้องมีวงเล็บครอบ await — `await f()?.name` จะไปอ่าน .name บน Promise (ได้ undefined)
  assert.equal((await db.getStudent(a.id, mine.id))?.name, 'โต๊ะที่ 1');

  // นี่คือช่องโหว่เดิมของการเข้าห้อง: นักเรียนส่ง studentId ตัวเอง
  // + gameId ของครูอื่นเข้าห้องได้ ตอนนี้ต้องผูกกับเจ้าของเกม
  const theirGame = (await db.getAllGames(other.id))[0];
  assert.equal(
    await db.getStudent(a.id, theirGame.ownerId),
    null,
    '⚠️ นักเรียนของครูหนึ่งต้องเข้าห้องของอีกครูไม่ได้'
  );
});

test('การส่ง ownerId มาในตัวข้อมูลไม่ทำให้ย้ายของของคนอื่นได้', async () => {
  const mine = await db.getAccountByUsername('krutest');
  const other = await db.getAccountByUsername('other');
  const victim = (await db.getStudents(other.id))[0];

  // แม้ผ่าน updateStudent ซึ่งต้องเป็นเจ้าของก่อน แต่ ownerId ใน updates ต้องถูกทิ้ง
  // ครูอื่นเรียกฟังก์ชันนี้ → ได้ null (ไม่ใช่ error) เพื่อให้ route ตอบ 404 ได้ตรง ๆ
  assert.equal(await db.updateStudent(victim.id, { totalXp: 99999 }, mine.id), null);

  // และแม้เป็นเจ้าของเอง ก็ย้ายของไปหาคนอื่นไม่ได้
  const mine2 = (await db.getStudents(mine.id))[0];
  const moved = await db.updateStudent(mine2.id, { ownerId: other.id }, mine.id);
  assert.equal(moved.ownerId, mine.id, '⚠️ ส่ง ownerId มาแล้วเด้งของไปหาครูอื่นได้');

  const unchanged = await db.getStudent(victim.id, other.id);
  assert.equal(unchanged.totalXp, 0, '⚠️ ข้อมูลนักเรียนคนอื่นถูกแก้');
});
