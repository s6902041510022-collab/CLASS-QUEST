import { existsSync, readFileSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname } from 'path';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BOSS_DAMAGE_PER_CORRECT } from './utils';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');
const DB_SEED_PATH = path.join(process.cwd(), 'data', 'db.default.json');

export type DBData = {
  games: any[];
  missions: any[];
  students: any[];
  players: any[];
  sessions: any[];
  teams: any[];
  teachers: any[];
  groups: any[];
  settings: { teacherPin: string; teacherName?: string; [key: string]: any };
};

const defaultData: DBData = {
  games: [],
  missions: [],
  students: [],
  players: [],
  sessions: [],
  teams: [],
  teachers: [],
  groups: [],
  settings: { teacherPin: '1234', teacherName: '' },
};

// ==================== ที่เก็บข้อมูล ====================
// โหมดที่ 1 (คอมพิวเตอร์ครู / dev) : เขียนไฟล์ data/db.json
// โหมดที่ 2 (Vercel)                  : เก็บทั้งฐานข้อมูลเป็น JSON ก้อนเดียวใน Redis (Upstash REST)
// เลือกอัตโนมัติ — ถ้ามี KV_REST_API_URL + KV_REST_API_TOKEN ให้ใช้โหมด Redis

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const KV_KEY = process.env.KV_DB_KEY || 'classquest:db';
// เก็บข้อมูลไว้ในหน่วยความจำชั่วคราวก่อน เพื่อไม่ให้ยิง Redis บ่อยเกินจำเป็น
// (นักเรียน 40 คนถามสถานะพร้อมกัน เก็บไว้ 2 วินาที = ลดจำนวนคำสั่งลงเหลือราวหนึ่งในสาม)
const CACHE_MS = 2000;

export const usingKv = Boolean(KV_URL && KV_TOKEN);

export type Store = {
  data: DBData;
  read(): Promise<void>;
  write(): Promise<void>;
  /** ค่าตอนที่อ่านมา ใช้รวมข้อมูลเมื่อเขียนชนกับคนอื่น */
  base?: DBData;
};

const clone = <T,>(v: T): T => (v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T));

/** เติมคีย์ที่ขาด และบอกว่าต้องแก้ไหม (รองรับไฟล์ข้อมูลจากเวอร์ชันเก่า) */
function normalize(data: any): { data: DBData; changed: boolean } {
  const out: any = { ...clone(defaultData), ...data };
  let changed = false;
  for (const key of Object.keys(defaultData) as (keyof DBData)[]) {
    if (out[key] == null) {
      out[key] = clone((defaultData as any)[key]);
      changed = true;
    }
  }
  if (!out.settings.teacherPin) {
    out.settings.teacherPin = '1234';
    changed = true;
  }
  return { data: out as DBData, changed };
}

/** ข้อมูลตั้งต้นสำหรับติดตั้งครั้งแรก */
function seedData(): DBData {
  if (existsSync(DB_SEED_PATH)) {
    try {
      return normalize(JSON.parse(readFileSync(DB_SEED_PATH, 'utf8'))).data;
    } catch {
      /* ใช้ค่าเริ่มต้นแทน */
    }
  }
  return normalize({}).data;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// เข้าคิวเขียนในเครื่องนี้ก่อน เพื่อไม่ให้ชนกันเอง (Vercel อาจมีหลาย instance)
let localQueue: Promise<unknown> = Promise.resolve();
function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const run = localQueue.then(fn, fn);
  localQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function kvCommand<T>(command: unknown[]): Promise<T> {
  const res = await fetch(KV_URL as string, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KV_TOKEN}` },
    body: JSON.stringify(command),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`KV ตอบกลับ ${res.status}`);
  const json: any = await res.json();
  if (json?.error) throw new Error(`KV: ${json.error}`);
  return json.result as T;
}

/**
 * ล็อกแบบกระจาย เพื่อให้การเขียนเกิดทีละรายการทั่วทั้งระบบ
 * (Vercel มีหลาย instance พร้อมกัน ใช้ตัวแปรในหน่วยความจำล็อกไม่ได้)
 */
async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const lockKey = `${KV_KEY}:lock`;
  const token = uuidv4();
  for (let attempt = 0; attempt < 40; attempt++) {
    const got = await kvCommand<string | null>(['SET', lockKey, token, 'NX', 'PX', '15000']).catch(
      () => null
    );
    if (got === 'OK') {
      try {
        return await fn();
      } finally {
        const cur = await kvCommand<string | null>(['GET', lockKey]).catch(() => null);
        if (cur === token) await kvCommand(['DEL', lockKey]).catch(() => null);
      }
    }
    await sleep(20 + Math.floor(Math.random() * 60) + attempt * 10); // สุ่มเพื่อไม่ให้ชนกัน
  }
  return fn(); // รอนานเกินไป — เขียนต่อแม้ไม่ได้ล็อก
}

// ---------- ชั้นเชื่อมต่อ (เลือกอัตโนมัติจาก env) ----------

type Backend = {
  label: string;
  /** อ่านข้อมูลล่าสุดที่ปลอดภัย (ต้องอยู่ในโหมดที่ไม่มีใครเขียนทับ) */
  load(): Promise<DBData>;
  /** บันทึกข้อมูล (ต้องอยู่ในโหมดที่ล็อกไว้แล้ว) */
  save(data: DBData): Promise<void>;
  /** ทำงานที่เขียนทีละครั้งทั้งระบบ */
  locked<T>(fn: () => Promise<T>): Promise<T>;
};

const fileBackend: Backend = {
  label: `ไฟล์ ${DB_PATH}`,
  async load() {
    if (!existsSync(DB_PATH)) {
      await mkdir(dirname(DB_PATH), { recursive: true });
      await writeFile(DB_PATH, JSON.stringify(seedData(), null, 2), 'utf8');
    }
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return normalize(JSON.parse(await readFile(DB_PATH, 'utf8'))).data;
      } catch {
        await sleep(30 + attempt * 40); // อ่านชนกับการเขียน — ลองใหม่
      }
    }
    return seedData();
  },
  async save(data) {
    await writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  },
  // โปรแกรมเดียวบนเครื่องครู คิวในเครื่องก็พอ (getDb().write() จะเข้าคิวนี้อยู่แล้ว)
  locked: async (fn) => fn(),
};

const kvBackend: Backend = {
  label: `Redis (${KV_KEY})`,
  async load() {
    const raw = await kvCommand<string | null>(['GET', KV_KEY]).catch(() => null);
    return normalize(raw ? JSON.parse(raw) : seedData()).data;
  },
  async save(data) {
    await kvCommand(['SET', KV_KEY, JSON.stringify(data)]);
  },
  locked: withLock,
};

const backend: Backend = usingKv ? kvBackend : fileBackend;
export const storeLabel = backend.label;

let cache: { data: DBData; at: number } | null = null;

export async function getDb(): Promise<Store> {
  if (!cache || Date.now() - cache.at >= CACHE_MS) {
    cache = { data: await backend.load(), at: Date.now() };
  }
  const base = clone(cache.data);

  const store: Store = {
    data: clone(base),
    base,
    async read() {},
    async write() {
      await serialize(() =>
        backend.locked(async () => {
          // อ่านของล่าสุดที่ปลอดภัย แล้วรวมงานของเราเข้าไป (กันการเขียนทับกัน)
          const theirs = await backend.load();
          store.data = mergeValue(base, store.data, theirs) as DBData;
          await backend.save(store.data);
          cache = { data: clone(store.data), at: Date.now() };
        })
      );
    },
  };
  return store;
}

const idOf = (r: any) => (r && typeof r === 'object' && r.id != null ? String(r.id) : null);
const same = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

/**
 * รวมข้อมูล 3 เวอร์ชัน เพื่อไม่ให้งานที่บันทึกพร้อมกันหาย
 * - orig  : สำเนาที่อ่านมาตอนเริ่ม
 * - mine  : สำเนาของเราหลังแก้ไข
 * - other : สำเนาล่าสุดที่คนอื่นเขียนไว้
 * ฝั่งไหนไม่ได้แตะค่านั้น ก็ใช้ของอีกฝั่ง
 */
function mergeValue(orig: any, mine: any, other: any): any {
  // อาร์เรย์ของค่าพื้นฐาน (เช่น ตัวเลือกคำตอบ) — เทียบทั้งก้อน
  if (Array.isArray(mine) && Array.isArray(other) && !mine.some((r) => r && typeof r === 'object')) {
    if (same(mine, orig)) return other;
    if (same(other, orig)) return mine;
    return mine;
  }

  // อาร์เรย์ของรายการที่มี id — รวมทีละรายการ
  if (Array.isArray(mine) && Array.isArray(other)) {
    const origArr: any[] = Array.isArray(orig) ? orig : [];
    const origMap = new Map(origArr.map((r) => [idOf(r), r]).filter(([k]) => k !== null) as [string, any][]);
    const mineMap = new Map(mine.map((r) => [idOf(r), r]).filter(([k]) => k !== null) as [string, any][]);
    const otherMap = new Map(other.map((r) => [idOf(r), r]).filter(([k]) => k !== null) as [string, any][]);
    const out: any[] = [];
    for (const r of other) if (idOf(r) === null) out.push(r); // ไม่มี id ใช้ของอีกฝั่ง
    for (const [id, o] of otherMap) {
      const m = mineMap.get(id);
      if (m === undefined) {
        if (!origMap.has(id)) out.push(o); // เขาเพิ่ม เราไม่แตะ
        continue; // ถ้ามีใน orig แปลว่าเราลบ -> ไม่เอา
      }
      out.push(mergeValue(origMap.get(id), m, o));
    }
    for (const [id, m] of mineMap) {
      if (!otherMap.has(id) && !origMap.has(id)) out.push(m); // เราเพิ่ม
    }
    return out;
  }

  // อ็อบเจกต์ — รวมทีละฟิลด์
  if (
    mine && other && typeof mine === 'object' && typeof other === 'object' &&
    !Array.isArray(mine) && !Array.isArray(other)
  ) {
    const out: any = {};
    for (const k of new Set([...Object.keys(mine), ...Object.keys(other)])) {
      out[k] = mergeValue(orig?.[k], mine[k], other[k]);
    }
    return out;
  }

  if (same(mine, orig)) return other; // เราไม่ได้แก้
  return mine; // เราแก้ (ถ้าชนกันจริงของเราชนะ)
}

// ==================== GAMES ====================

export async function createGame(data: any) {
  const db = await getDb();
  const game = {
    id: uuidv4(),
    ...data,
    status: 'draft',
    roomCode: generateRoomCode(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.data.games.push(game);
  await db.write();
  return game;
}

export const getGame = async (id: string) =>
  (await getDb()).data.games.find((g: any) => g.id === id);

export const getGameByRoomCode = async (code: string) =>
  (await getDb()).data.games.find((g: any) => g.roomCode === code);

export const getAllGames = async () => (await getDb()).data.games;

export async function updateGame(id: string, updates: any) {
  const db = await getDb();
  const i = db.data.games.findIndex((g: any) => g.id === id);
  if (i === -1) return null;
  db.data.games[i] = { ...db.data.games[i], ...updates, updatedAt: new Date().toISOString() };
  await db.write();
  return db.data.games[i];
}

export async function deleteGame(id: string) {
  const db = await getDb();
  const i = db.data.games.findIndex((g: any) => g.id === id);
  if (i === -1) return false;
  db.data.games.splice(i, 1);
  db.data.missions = db.data.missions.filter((m: any) => m.gameId !== id);
  db.data.players = db.data.players.filter((p: any) => p.gameId !== id);
  db.data.sessions = db.data.sessions.filter((s: any) => s.gameId !== id);
  db.data.teams = db.data.teams.filter((t: any) => t.gameId !== id);
  await db.write();
  return true;
}

// ==================== MISSIONS ====================

export async function createMission(data: any) {
  const db = await getDb();
  const count = db.data.missions.filter((m: any) => m.gameId === data.gameId).length;
  const mission = {
    id: uuidv4(),
    ...data,
    order: data.order ?? count + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.data.missions.push(mission);
  await db.write();
  return mission;
}

export async function getMissions(gameId: string) {
  return (await getDb()).data.missions
    .filter((m: any) => m.gameId === gameId)
    .sort((a: any, b: any) => a.order - b.order);
}

/**
 * Mission ที่ใช้เล่นจริง (ไม่รวมด่านบอส) — ใช้จบรอบควิซแล้วค่อยเข้าบอส
 * เรียงตาม order เหมือนการ์ดครูมองเห็น
 */
export async function getQuizMissions(gameId: string) {
  return (await getDb()).data.missions
    .filter((m: any) => m.gameId === gameId && m.type !== 'boss')
    .sort((a: any, b: any) => a.order - b.order);
}

/**
 * ลำดับ Mission ในการเล่น: ควิซทั้งหมดก่อน แล้วด่านบอสต่อท้ายเสมอ
 * ฝั่งครูกด "ถัดไป" / ฝั่งนักเรียนอ่าน currentMissionIndex ใช้ลำดับนี้เหมือนกัน
 */
export function sortMissionsForPlay(list: any[]) {
  return [...list]
    .sort((a: any, b: any) => a.order - b.order)
    .sort((a: any, b: any) => (a.type === 'boss' ? 1 : 0) - (b.type === 'boss' ? 1 : 0));
}

export const getMission = async (id: string) =>
  (await getDb()).data.missions.find((m: any) => m.id === id);

export async function updateMission(id: string, updates: any) {
  const db = await getDb();
  const i = db.data.missions.findIndex((m: any) => m.id === id);
  if (i === -1) return null;
  db.data.missions[i] = { ...db.data.missions[i], ...updates, updatedAt: new Date().toISOString() };
  await db.write();
  return db.data.missions[i];
}

export async function deleteMission(id: string) {
  const db = await getDb();
  const i = db.data.missions.findIndex((m: any) => m.id === id);
  if (i === -1) return false;
  db.data.missions.splice(i, 1);
  await db.write();
  return true;
}

// ==================== STUDENTS (รายชื่อนักเรียน) ====================

export const getStudents = async () => (await getDb()).data.students;
export const getStudent = async (id: string) =>
  (await getDb()).data.students.find((s: any) => s.id === id);

export const findStudentByName = async (name: string) => {
  const t = name.trim().toLowerCase();
  return (await getDb()).data.students.find((s: any) => s.name.trim().toLowerCase() === t);
};

function newStudent(name: string, avatar: string) {
  return {
    id: uuidv4(),
    name: name.trim(),
    avatar: avatar || '🦊',
    totalXp: 0,
    gamesPlayed: 0,
    correctAnswers: 0,
    totalAnswers: 0,
    completedSessions: [] as string[],
    createdAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
  };
}

export async function createStudent(data: any) {
  const db = await getDb();
  const existing = data.name ? await findStudentByName(data.name) : undefined;
  if (existing) return existing;
  const student = newStudent(data.name, data.avatar);
  db.data.students.push(student);
  await db.write();
  return student;
}

// เพิ่มรายชื่อนักเรียน (ครูเพิ่มเอง)
export async function addStudent(name: string, avatar = '🦊') {
  const db = await getDb();
  const existing = await findStudentByName(name);
  if (existing) return existing;
  const student = newStudent(name, avatar);
  db.data.students.push(student);
  await db.write();
  return student;
}

export async function updateStudent(id: string, updates: any) {
  const db = await getDb();
  const i = db.data.students.findIndex((s: any) => s.id === id);
  if (i === -1) return null;
  db.data.students[i] = { ...db.data.students[i], ...updates, lastSeenAt: new Date().toISOString() };
  await db.write();
  return db.data.students[i];
}

export async function deleteStudent(id: string) {
  const db = await getDb();
  const i = db.data.students.findIndex((s: any) => s.id === id);
  if (i === -1) return false;
  db.data.students.splice(i, 1);
  // ลบคะแนน/รอบการเล่นของคนนี้ไปด้วย (กันคะแนนค้างในเกม/รอบที่ลบชื่อไปแล้ว)
  db.data.players = db.data.players.filter((p: any) => p.studentId !== id);
  await db.write();
  return true;
}

// ==================== GROUPS (ห้องเรียน/โฟลเดอร์) ====================

export const getGroups = async () => (await getDb()).data.groups;

export async function addGroup(name: string) {
  const db = await getDb();
  const trimmed = String(name).trim();
  if (!trimmed) return null;
  const dup = db.data.groups.find((g: any) => String(g.name).trim() === trimmed);
  if (dup) return dup;
  const group = { id: uuidv4(), name: trimmed, createdAt: new Date().toISOString() };
  db.data.groups.push(group);
  await db.write();
  return group;
}

export async function deleteGroup(id: string) {
  const db = await getDb();
  const i = db.data.groups.findIndex((g: any) => g.id === id);
  if (i === -1) return false;
  db.data.groups.splice(i, 1);
  // นักเรียนในห้องนั้นกลับไป "ไม่มีห้อง"
  db.data.students.forEach((s: any) => {
    if (s.groupId === id) s.groupId = '';
  });
  await db.write();
  return true;
}

export async function getStudentHistory(studentId: string) {
  const db = await getDb();
  return db.data.players
    .filter((p: any) => p.studentId === studentId)
    .sort((a: any, b: any) => String(b.joinedAt).localeCompare(String(a.joinedAt)))
    .map((p: any) => {
      const session = db.data.sessions.find((s: any) => s.id === p.sessionId);
      const game = db.data.games.find((g: any) => g.id === p.gameId);
      return {
        playerId: p.id,
        gameId: p.gameId,
        gameName: game?.name || 'เกม',
        sessionId: p.sessionId,
        status: session?.status || 'completed',
        xp: p.xp || 0,
        correct: p.correctAnswers || 0,
        total: p.totalAnswers || 0,
        answers: p.answers || [],
        joinedAt: p.joinedAt,
        endedAt: session?.endedAt,
      };
    });
}

// ==================== PLAYERS (ผู้เล่นแต่ละรอบ) ====================

export async function createPlayer(data: any) {
  const db = await getDb();
  const player = {
    id: uuidv4(),
    ...data,
    xp: 0,
    correctAnswers: 0,
    totalAnswers: 0,
    answers: [],
    // ตำแหน่งการเล่นแบบ "นักเรียนไปเอง" (self-paced) — แต่ละคนเลื่อนข้อตามจังหวะตัวเอง
    posMission: 0,
    posQuestion: 0,
    quizDone: false,
    bossPos: 0,
    bossDone: false,
    joinedAt: new Date().toISOString(),
  };
  db.data.players.push(player);
  await db.write();
  return player;
}

// ผู้เล่นในห้องเล่นปัจจุบัน (สำหรับหน้าครู) — เอาคนละ record เพื่อกันกระดานซ้ำ
export async function getPlayers(gameId: string) {
  const session = await getSession(gameId);
  if (!session) return [];
  const list = (await getDb()).data.players.filter(
    (p: any) => p.gameId === gameId && p.sessionId === session.id
  );
  const latest = new Map<string, any>();
  for (const p of list) latest.set(p.studentId || p.id, p);
  return [...latest.values()];
}

// ผู้เล่นทุกรอบของเกม (สำหรับวิเคราะห์ย้อนหลัง)
export const getAllPlayers = async (gameId: string) =>
  (await getDb()).data.players.filter((p: any) => p.gameId === gameId);

export const getPlayer = async (id: string) =>
  (await getDb()).data.players.find((p: any) => p.id === id);

export async function updatePlayer(id: string, updates: any) {
  const db = await getDb();
  const i = db.data.players.findIndex((p: any) => p.id === id);
  if (i === -1) return null;
  db.data.players[i] = { ...db.data.players[i], ...updates };
  await db.write();
  return db.data.players[i];
}

/**
 * เลื่อนตำแหน่งของนักเรียนไปข้อถัดไป (โหมด "นักเรียนไปเอง" / self-paced)
 * - ยังอยู่ในด่านควิซ → ข้ามข้อถัดไปของ Mission นั้น (ข้าม Mission ที่ไม่มีคำถาม)
 * - ตอบครบทุกข้อควิซ → ตีตรา quizDone (ได้เข้าสู้บอสเมื่อครูกดเปิดด่านบอส)
 * - อยู่ในด่านบอส (ควิซผ่านแล้ว) → เลื่อนคำถามบอส ครบแล้วตีตรา bossDone
 * ทำงานบน player ในหน่วยความจำ — เรียกก่อน db.write() เพื่อเขียนรอบเดียว
 */
export function advancePlayerPosition(db: any, player: any): void {
  const si = currentSessionIndex(db.data.sessions, player.gameId);
  const session = si >= 0 ? db.data.sessions[si] : undefined;
  const flow = sortMissionsForPlay(
    (db.data.missions || []).filter((m: any) => m.gameId === player.gameId)
  );
  const quiz = flow.filter((m: any) => m.type !== 'boss');
  const bossMission = flow.find((m: any) => m.type === 'boss');

  // อยู่ในด่านบอส และผ่านด่านควิซมาแล้ว → เลื่อนคำถามบอส
  if (session?.status === 'boss' && player.quizDone && bossMission) {
    const total = bossMission.questions?.length || 0;
    const next = Math.max(0, Number(player.bossPos) || 0) + 1;
    if (next < total) {
      player.bossPos = next;
    } else {
      player.bossPos = total;
      player.bossDone = true;
    }
    return;
  }

  // ยังอยู่ในด่านควิซ → เลื่อนข้อควิซ
  if (quiz.length === 0) {
    // เกมที่มีแต่ด่านบอส → ผ่านควิซได้เลย
    player.quizDone = true;
    return;
  }

  let mi = Math.max(0, Number(player.posMission) || 0);
  let qi = Math.max(0, Number(player.posQuestion) || 0);
  const startMi = mi;

  // ข้าม Mission ที่ไม่มีคำถาม (ถ้าตัวอยู่จุดนั้น ให้เริ่มข้อแรกของ Mission ถัดไป)
  while (mi < quiz.length && !(quiz[mi].questions?.length > 0)) mi++;
  if (mi >= quiz.length) {
    player.quizDone = true;
    return;
  }
  if (mi !== startMi) qi = 0;

  if (qi + 1 < (quiz[mi].questions?.length || 0)) {
    qi += 1;
  } else {
    // หมด Mission นี้ → Mission ถัดไปที่มีคำถาม
    mi += 1;
    while (mi < quiz.length && !(quiz[mi].questions?.length > 0)) mi++;
    qi = 0;
  }

  if (mi < quiz.length) {
    player.posMission = mi;
    player.posQuestion = qi;
  } else {
    // ตอบครบทุกข้อควิซแล้ว → ผ่านได้เลย (เข้าบอสเมื่อครูกดเปิด)
    player.quizDone = true;
  }
}

// นำคะแนนของรอบหนึ่งเข้าสถิติถาวร (กันนับซ้ำด้วย completedSessions)
export async function rollUp(studentId: string | undefined, sessionId: string, player: any) {
  if (!studentId) return;
  const student = await getStudent(studentId);
  if (!student) return;
  if ((student.completedSessions || []).includes(sessionId)) return;
  await updateStudent(studentId, {
    totalXp: (student.totalXp || 0) + (player.xp || 0),
    gamesPlayed: (student.gamesPlayed || 0) + 1,
    correctAnswers: (student.correctAnswers || 0) + (player.correctAnswers || 0),
    totalAnswers: (student.totalAnswers || 0) + (player.totalAnswers || 0),
    completedSessions: [...(student.completedSessions || []), sessionId],
  });
}

/**
 * ปิดรอบเมื่อบอสตาย: ดูจาก "ข้อมูลรวมหลัง merge" ว่าระบุ HP ต่ำกว่า 0 หรือไม่
 * เพราะตอนหลายคนตอบถูกพร้อมกัน แต่ละคนเห็นข้อมูลเพียงส่วนเดียว ต้องรอรวมแล้วค่อยสรุป
 * แล้วนำคะแนนของทุกคนในรอบเข้าสถิติถาวร (กันซ้ำด้วย completedSessions)
 */
export async function completeSessionWithRollup(gameId: string) {
  const db = await getDb();
  const i = currentSessionIndex(db.data.sessions, gameId);
  if (i === -1) return false;
  const session = db.data.sessions[i];
  if (session.status !== 'boss') return false; // ครูจบเกมไปแล้ว
  if (sessionBossHpLeft(session) > 0) return false; // ข้อมูลยังรวมไม่ครบ/บอสยังไม่ตาย

  session.status = 'completed';
  session.endedAt = new Date().toISOString();
  session.timeRunning = false;
  session.timeDeadline = null;

  const players = db.data.players.filter(
    (p: any) => p.gameId === gameId && p.sessionId === session.id
  );
  await db.write();
  for (const p of players) {
    if (p.studentId) await rollUp(p.studentId, session.id, p);
  }
  return true;
}

// รอ "ช่วงลมจับ" ก่อนประกาศจบเกมบอส: HP อาจแตะ 0 พอดีกลาง batch ที่หลายคนตอบพร้อมกัน
// (เช่น เหลือ 200 HP แล้วคนถัดไปยิงอีก 200 = 0) — ถ้าจบเลย จะ rollUp เก็บคำตอบไม่ครบ
// เพราะคำตอบที่เหลือยังลอยอยู่ข้างทาง ให้ตีตรา bossDefeatedAt แล้วค่อยจบเมื่อครบเวลา
const BOSS_SETTLE_MS = 2500;

/**
 * ตรวจหลัง merge ว่าบอสตายแล้วและเลยช่วงลมจับหรือยัง ถ้าถึงกำหนด → ปิดรอบ (complete+rollUp)
 * - HP ยัง > 0     → false (ยังไม่ตาย)
 * - HP <= 0 ครั้งแรก → ตีตรา bossDefeatedAt ยังไม่จบ (ให้คำตอบที่ลอยมาไปถึงครบก่อน)
 * - เลย BOSS_SETTLE_MS → completeSessionWithRollup
 */
export async function settleBossDefeat(gameId: string): Promise<boolean> {
  const db = await getDb();
  const i = currentSessionIndex(db.data.sessions, gameId);
  if (i === -1) return false;
  const session: any = db.data.sessions[i];
  if (session.status !== 'boss') return false;
  if (sessionBossHpLeft(session) > 0) return false;

  if (!session.bossDefeatedAt) {
    session.bossDefeatedAt = new Date().toISOString();
    await db.write();
    return false; // ยังไม่จบ รอคำตอบที่เหลือ
  }
  const settled = Date.now() - new Date(session.bossDefeatedAt).getTime() >= BOSS_SETTLE_MS;
  if (!settled) return false;
  await completeSessionWithRollup(gameId);
  return true;
}

// ==================== TEAMS ====================

export async function createTeams(gameId: string, count: number) {
  const db = await getDb();
  const names = ['Team CPU', 'Team Cache', 'Team RAM', 'Team Storage'];
  const colors = ['bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-orange-400'];
  const teams = [];
  for (let i = 0; i < count; i++) {
    const t = {
      id: uuidv4(),
      gameId,
      name: names[i] || `Team ${i + 1}`,
      color: colors[i] || 'bg-gray-400',
      totalXp: 0,
    };
    teams.push(t);
    db.data.teams.push(t);
  }
  await db.write();
  return teams;
}

export const getTeams = async (gameId: string) =>
  (await getDb()).data.teams.filter((t: any) => t.gameId === gameId);

export const getSessions = async (gameId: string) =>
  (await getDb()).data.sessions.filter((s: any) => s.gameId === gameId);

// ==================== SESSIONS (รอบการเล่น) ====================

// ---------- จับเวลา (ครูควบคุมได้ระหว่างเล่น) ----------
// เก็บเป็น "เวลาสิ้นสุด" (timeDeadline = epoch ms) เวลาที่เหลือจึงคิดจากนาฬิกาเซิร์ฟเวอร์
// นักเรียนทุกคนจึงเห็นเวลาเท่ากัน แม้นาฬิกาเครื่องต่างกัน

/** เวลาสูงสุด 1 ชั่วโมง — กันครูกดผิดจนเวลาบ้านปลาย */
const TIME_MAX = 3600;

/** เวลาที่เหลือจริงเป็นวินาที (0 = ไม่จับเวลา) */
export function liveTimeLeft(session: any): number {
  const total = Number(session?.timeLimit) || 0;
  if (total <= 0) return 0;
  if (session?.timeRunning && session?.timeDeadline) {
    return Math.max(0, Math.ceil((Number(session.timeDeadline) - Date.now()) / 1000));
  }
  return Math.max(0, Number(session?.timeLeft) || 0);
}

const clampTime = (v: any) => Math.max(0, Math.min(TIME_MAX, Math.round(Number(v) || 0)));

/** สั่งจับเวลา — คำนวณทั้งหมดบนเซิร์ฟเวอร์ ครูกดปุ่มเดียวจบ ไม่ต้องเดานาฬิกา */
function applyTimeAction(s: any, action: string, seconds: any) {
  const now = Date.now();
  const left = liveTimeLeft(s);
  const running = Boolean(s.timeRunning);

  if (action === 'off') {
    Object.assign(s, { timeLimit: 0, timeLeft: 0, timeRunning: false, timeDeadline: null });
    return;
  }
  if (action === 'start') {
    if ((Number(s.timeLimit) || 0) <= 0) return; // ยังไม่ได้ตั้งเวลา
    Object.assign(s, { timeLeft: left, timeRunning: true, timeDeadline: now + left * 1000 });
    return;
  }
  if (action === 'pause') {
    Object.assign(s, { timeLeft: left, timeRunning: false, timeDeadline: null });
    return;
  }
  if (action === 'add' || action === 'sub') {
    const delta = clampTime(seconds) * (action === 'add' ? 1 : -1);
    const next = clampTime(left + delta);
    // โหมด self-paced: timeLimit คือ "เวลาต่อข้อของทุกคน" ดังนั้น +/− ต้องเปลี่ยนงบด้วย
    // ไม่งั้นฝั่งนักเรียน (ซึ่งนับถอยหลังในใจจาก timeLimit) จะไม่เห็นผลที่ครูกด
    Object.assign(s, {
      timeLimit: next,
      timeLeft: next,
      timeDeadline: running ? now + next * 1000 : null,
    });
    return;
  }
  if (action === 'set') {
    // "ตั้งเวลา" = ตั้งแล้วเริ่มนับทันที (ถ้าต้องการหยุด ครูกดปุ่มหยุดเอง)
    const next = clampTime(seconds);
    Object.assign(s, {
      timeLimit: next,
      timeLeft: next,
      timeRunning: next > 0,
      timeDeadline: next > 0 ? now + next * 1000 : null,
    });
  }
}

/** เปลี่ยนคำถาม -> ตั้งเวลาใหม่ตามที่ครูกำหนดไว้ใน Mission (0 = ไม่จับเวลา) */
function resetTimerForQuestion(s: any, mission: any) {
  const limit = clampTime(mission?.timeLimit);
  // ทั้งเฟสคำถามปกติและเฟสบอส ให้นาฬิกาเริ่มเดินเองได้
  const run = limit > 0 && (s.status === 'question' || s.status === 'boss');
  Object.assign(s, {
    timeLimit: limit,
    timeLeft: limit,
    timeRunning: run,
    timeDeadline: run ? Date.now() + limit * 1000 : null,
    timePausedByGame: false,
  });
}

export function currentSessionIndex(sessions: any[], gameId: string) {
  const mine = sessions.filter((s: any) => s.gameId === gameId);
  if (mine.length === 0) return -1;
  const active = mine.filter((s: any) => s.status !== 'completed');
  const target = active.length > 0 ? active[active.length - 1] : mine[mine.length - 1];
  return sessions.findIndex((s: any) => s.id === target.id);
}

/** HP บอสที่เหลือ คำนวณจากประวัติโจมตี (กันเขียนพร้อมกันแล้วข้อมูลหาย) */
export function sessionBossHpLeft(session: any): number {
  const max = Number(session?.bossHp) || 0;
  if (max <= 0) return 0;
  const hits = Array.isArray(session?.bossHits) ? session.bossHits.length : 0;
  return Math.max(0, max - hits * BOSS_DAMAGE_PER_CORRECT);
}

/**
 * เปิดรอบการเล่น
 * - ครูสั่ง `force: true` เมื่อกดเริ่มใหม่ (ล้างผู้เล่นเก่าออก)
 * - นักเรียนเข้าห้องเรียกแบบไม่มี force -> ใช้รอบที่ยังเปิดอยู่
 *   กันกรณีนักเรียนเข้าพร้อมกันหลายคนแล้วเปิดห้องซ้ำจนผู้เล่นหาย
 */
export async function createSession(gameId: string, options: { force?: boolean } = {}) {
  const db = await getDb();
  const game = await getGame(gameId);
  const mine = db.data.sessions.filter((s: any) => s.gameId === gameId);
  const active = mine.filter((s: any) => s.status !== 'completed');

  if (!options.force && active.length > 0) return active[active.length - 1];

  // ปิดรอบเก่าที่ยังค้างอยู่ (เก็บข้อมูลไว้เป็นประวัติ)
  db.data.sessions.forEach((s: any) => {
    if (s.gameId === gameId && s.status !== 'completed') {
      s.status = 'completed';
      s.endedAt = s.endedAt || new Date().toISOString();
    }
  });

  const session = {
    // id ตามเลขรอบ เพื่อให้พร้อมกันแล้วได้ id เดียวกัน ไม่เกิดห้องซ้ำ
    id: `${gameId}-r${mine.length + 1}`,
    gameId,
    status: 'lobby',
    currentMissionIndex: 0,
    currentQuestionIndex: 0,
    bossHp: game?.bossHp || 1000,
    startedAt: null,
    endedAt: null,
    timeLimit: 0,
    timeLeft: 0,
    timeRunning: false,
    timeDeadline: null,
    timePausedByGame: false,
  };
  const dup = db.data.sessions.find((s: any) => s.id === session.id);
  if (dup) return dup; // มีอยู่แล้ว (เพิ่งถูกสร้างจากคำขอพร้อมกัน)
  db.data.sessions.push(session);
  await db.write();
  return session;
}

export async function getSession(gameId: string) {
  const db = await getDb();
  const i = currentSessionIndex(db.data.sessions, gameId);
  if (i === -1) return undefined;
  const session = db.data.sessions[i];
  return { ...session, timeLeft: liveTimeLeft(session), bossHpLeft: sessionBossHpLeft(session) };
}

/**
 * อัปเดตห้องเล่น + จัดการนาฬิกา
 * - ครูเลื่อน/ย้อน/เริ่มคำถาม -> ตั้งเวลาใหม่ตาม Mission
 * - เกมหยุด/เข้า BOSS/จบ -> นาฬิกาหยุดตาม
 * - timeAction: start | pause | add | sub | set | off (ครูกดปุ่มจับเวลา)
 */
export async function updateSessionLive(gameId: string, updates: any) {
  const { timeAction, timeSeconds, ...rest } = updates || {};
  const db = await getDb();
  const i = currentSessionIndex(db.data.sessions, gameId);
  if (i === -1) return null;

  const before = db.data.sessions[i];
  const next: any = { ...before, ...rest };
  const moved = rest.currentMissionIndex != null || rest.currentQuestionIndex != null;
  // ลำดับ Mission ในการเล่น = ควิซก่อน แล้วบอสต่อท้าย (ตรงกับหน้าครู/นักเรียน)
  const missionAt = (index: number) =>
    sortMissionsForPlay(db.data.missions.filter((m: any) => m.gameId === gameId))[index];

  if (moved) {
    // ครูเลื่อน/ย้อนคำถาม -> เริ่มจับเวลาใหม่ตามเวลาที่ครูตั้งไว้ใน Mission
    resetTimerForQuestion(next, missionAt(next.currentMissionIndex));
  } else if (rest.status === 'question' && before.status === 'paused') {
    // ครูกด "เล่นต่อ" -> นาฬิกาเดินต่อถ้าก่อนหน้านี้หยุดเพราะเกมพัก
    // (ถ้าครูกดหยุดนาฬิกาเอง จะไม่ถูกมาเดินต่อเอง)
    if (next.timePausedByGame) {
      const left = liveTimeLeft(next);
      Object.assign(next, {
        timeLeft: left,
        timeRunning: true,
        timeDeadline: Date.now() + left * 1000,
        timePausedByGame: false,
      });
    }
  } else if (rest.status === 'question' && before.status !== 'question') {
    // เริ่มเล่นคำถามใหม่ (จากห้องรอ/หลังบอส) -> จับเวลาใหม่
    resetTimerForQuestion(next, missionAt(next.currentMissionIndex));
  } else if (rest.status && rest.status !== 'question' && next.timeRunning) {
    // เกมไม่ได้เล่นคำถาม (หยุด/บอส/จบ) -> นาฬิกาหยุดตาม
    Object.assign(next, {
      timeLeft: liveTimeLeft(next),
      timeRunning: false,
      timeDeadline: null,
      timePausedByGame: rest.status === 'paused',
    });
  }

  if (timeAction) {
    next.timePausedByGame = false; // ครูสั่งเอง = คุมเต็มที่
    applyTimeAction(next, timeAction, timeSeconds);
  }

  db.data.sessions[i] = next;
  await db.write();
  return { ...next, timeLeft: liveTimeLeft(next), bossHpLeft: sessionBossHpLeft(next) };
}

// ==================== TEACHER & SETTINGS ====================

export async function getTeacher() {
  const db = await getDb();
  if (db.data.teachers.length > 0) return db.data.teachers[0];
  return { id: 'default', name: db.data.settings.teacherName || '', avatar: '👨‍🏫' };
}

export async function saveTeacher(data: any) {
  const db = await getDb();
  if (db.data.teachers.length === 0) {
    db.data.teachers.push({ id: uuidv4(), name: String(data.name || '').trim(), avatar: data.avatar || '👨‍🏫' });
  } else {
    db.data.teachers[0] = { ...db.data.teachers[0], name: String(data.name || '').trim(), avatar: data.avatar || db.data.teachers[0].avatar };
  }
  db.data.settings.teacherName = String(data.name || '').trim();
  await db.write();
  return db.data.teachers[0];
}

export async function verifyPin(pin: string) {
  return pin === (await getDb()).data.settings.teacherPin;
}

export const getSettings = async () => (await getDb()).data.settings;

export async function updateSettings(updates: any) {
  const db = await getDb();
  db.data.settings = { ...db.data.settings, ...updates };
  await db.write();
  return db.data.settings;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}
