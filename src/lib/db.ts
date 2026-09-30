import { existsSync, readFileSync, constants } from 'fs';
import { access, mkdir, readFile, writeFile } from 'fs/promises';
import { dirname } from 'path';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BOSS_DAMAGE_PER_CORRECT } from './utils';
import { missionToTasks } from './mission-tasks';
import { isFirebaseConfigured, getFirestoreDb } from './firebase';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');
const DB_SEED_PATH = path.join(process.cwd(), 'data', 'db.default.json');

/**
 * บัญชีครู — เก็บในตัวแรกของ teachers
 *
 * เดิมช่องนี้เก็บครูคนเดียว (ไม่มีรหัสผ่าน) ตอนนี้เก็บได้หลายคน
 * ของเก่าที่ยังไม่มี username/passwordHash ถือว่าเป็นบัญชีที่ยังเข้าไม่ได้
 * และจะถูกผูกให้กับครูคนแรกที่สมัคร (ดู adoptLegacyTeacher)
 */
export type TeacherAccount = {
  id: string;
  username: string;
  name: string;
  avatar: string;
  /** ผลจาก hashPassword() — ห้ามเก็บรหัสผ่านดิบเด็ดขาด */
  passwordHash: string;
  createdAt: string;
};

/** โทเคนการเข้าสู่ระบบ เก็บไว้ฝั่งเซิร์ฟเวอร์ ไม่ใช่ในคุกกี้แบบอ่านได้ */
export type AuthSession = {
  /**
   * คีย์สำหรับ mergeValue — ต้องมี ไม่งั้นเซสชันของครูสองคนที่ล็อกอินพร้อมกัน
   * จะหั่นทิ้งอันหนึ่ง (คนที่โชคดีกว่าคนที่โชคร้ายจะถูกเด้งออกจากระบบทันที)
   *
   * ใช้ค่าเดียวกับ token เพราะ token มีเอกลักษณ์อยู่แล้ว ไม่ต้องคิด id แยก
   * ดูรายละเอียดที่ mergeValue()
   */
  id?: string;
  token: string;
  accountId: string;
  createdAt: string;
  expiresAt: string;
};

export type DBData = {
  games: any[];
  missions: any[];
  students: any[];
  players: any[];
  sessions: any[];
  teams: any[];
  teachers: TeacherAccount[];
  authSessions: AuthSession[];
  groups: any[];
  // ⚠️ ไม่มี teacherPin อีกแล้ว — เดิมเป็น PIN 4 หลักที่ตั้งไว้ทั้งระบบ (คนเดียวทั้งชั้น)
  //    ตอนนี้ครูแต่ละคนมี username + password ของตัวเองใน teachers[]
  //    เก็บรหัสผ่านไว้ที่เดียวทั้งระบบคือช่องโหว่: รหัสเดียวหลุด = ทุกคนเข้าได้
  settings: { teacherName?: string; [key: string]: any };
};

const defaultData: DBData = {
  games: [],
  missions: [],
  students: [],
  players: [],
  sessions: [],
  teams: [],
  teachers: [],
  authSessions: [],
  groups: [],
  settings: { teacherName: '' },
};

/** อายุเซสชัน 30 วัน — ครูเปิดเว็บใช้ตลอดเทอมไม่ต้องล็อกอินบ่อย */
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// ==================== ที่เก็บข้อมูล ====================
// โหมดที่ 1 (คอมพิวเตอร์ครู / dev) : เขียนไฟล์ data/db.json
// โหมดที่ 2 (Vercel)                  : เก็บทั้งฐานข้อมูลเป็น JSON ก้อนเดียวใน Redis (Upstash REST)
// เลือกอัตโนมัติ — ถ้ามี KV_REST_API_URL + KV_REST_API_TOKEN ให้ใช้โหมด Redis

/**
 * ชื่อ env สำหรับ Upstash REST มีได้หลายแบบ ขึ้นกับว่าติดตั้งผ่านทางไหน
 *
 * - Vercel > Integrations > Upstash          -> KV_REST_API_URL / KV_REST_API_TOKEN
 * - Upstash โดยตรง (นอก Vercel)              -> UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 *
 * รับทั้งสองชื่อ เพราะถ้ารองรับแค่ชื่อเดียว แล้วผู้ใช้ติดตั้งผ่านอีกทาง
 * ระบบจะเงียบ ๆ ไม่เห็นฐานข้อมูล ตกไปใช้ไฟล์ แล้วพังด้วย EROFS
 * โดยไม่บอกว่าตั้งค่าไม่ครบ — ซึ่งเป็นปัญหาเดิมที่เสียเวลาแก้ไปแล้ว
 */
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KV_KEY = process.env.KV_DB_KEY || 'classquest:db';
// เก็บข้อมูลไว้ในหน่วยความจำชั่วคราวก่อน เพื่อไม่ให้ยิง Redis บ่อยเกินจำเป็น
// (นักเรียน 40 คนถามสถานะพร้อมกัน เก็บไว้ 2 วินาที = ลดจำนวนคำสั่งลงเหลือราวหนึ่งในสาม)
const CACHE_MS = 2000;

export const usingKv = Boolean(KV_URL && KV_TOKEN);
export const usingFirestore = isFirebaseConfigured();

/**
 * ติดตั้ง integration ผิดตัว — ต้องรู้ ไม่งั้นจะพังเงียบ ๆ
 *
 * Vercel Marketplace มี Redis ให้เลือก 2 เจ้า และคนละโปรโตคอลกัน:
 * - Upstash  -> KV_REST_API_URL + KV_REST_API_TOKEN (REST)  ← ใช้ได้
 * - Redis    -> REDIS_URL (redis:// มาตรฐาน, ต้องใช้ TCP client) ← ใช้ไม่ได้
 *
 * ถ้าเจอ REDIS_URL แต่ไม่มีค่าของ Upstash แปลว่าผู้ใช้ติดตั้งชื่อผิด
 * ต้องบอกตรง ๆ ไม่ใช่ปล่อยให้ตกไปใช้ไฟล์แล้วเจอ EROFS
 * ซึ่งจะทำให้เขาเข้าใจว่าปัญหาอยู่ที่ระบบ ไม่ใช่ที่เลือกผิด integration
 */
export const wrongRedisIntegration = !usingKv && Boolean(process.env.REDIS_URL);

/**
 * ตั้ง token แบบอ่านอย่างเดียว — อาการเหมือนระบบเสีย แต่ไม่ใช่
 *
 * Upstash ออกโทเคนให้ 2 ใบ: ใบเขียนได้ (ใช้ชื่อ ..._TOKEN) กับใบอ่านอย่างเดียว
 * (ชื่อ ..._READ_ONLY_TOKEN) ทั้งคู่อยู่ในหน้า Environment Variables ของ Vercel
 * เรียงติดกันมองเหมือนกัน จึงมีโอกาสสูงที่จะคัดลอกใบผิดมาวาง
 *
 * ถ้าใช้ใบอ่านอย่างเดียว: อ่านได้ปกติ แต่ SET/DEL โดนปฏิเสธ
 * ซึ่งดูจากข้างนอกเหมือนฐานข้อมูลเพี้ยน ไม่ใช่เหมือนตั้ง token ผิด
 * จึงต้องบอกตรง ๆ ไม่ใช่ปล่อยให้ไปตายเงียบ ๆ
 */
export const readOnlyTokenOnly =
  !usingKv &&
  Boolean(process.env.KV_REST_API_READ_ONLY_TOKEN || process.env.UPSTASH_REDIS_READ_ONLY_TOKEN) &&
  Boolean(
    process.env.KV_REST_API_URL ||
      process.env.UPSTASH_REDIS_REST_URL
  );

/** ข้อความบอกว่าใส่โทเคนผิดใบ */
export function explainReadOnlyToken(): string {
  return (
    `ตั้งโทเคนแบบอ่านอย่างเดียว (READ_ONLY_TOKEN) ซึ่งเขียนข้อมูลไม่ได้ ` +
    `— ต้องใช้โทเคนใบที่เขียนได้ ชื่อ ${KV_URL ? 'KV_REST_API_TOKEN' : 'UPSTASH_REDIS_REST_TOKEN'} ` +
    `(ดูได้ที่ Vercel > Settings > Environment Variables ชื่อที่ลงท้ายด้วย _TOKEN ไม่มีคำว่า READ_ONLY)`
  );
}

/** ข้อความบอกว่าติดตั้ง integration ผิดตัว */
export function explainWrongIntegration(): string {
  return (
    `ตั้ง REDIS_URL ซึ่งเป็น Redis มาตรฐาน (โปรโตคอล TCP) แต่ระบบนี้คุยผ่าน Upstash REST ` +
    `— โค้ดชุดนี้อ่านได้แค่ KV_REST_API_URL / KV_REST_API_TOKEN ` +
    `ต้องติดตั้ง integration ชื่อ "Upstash" (ไม่ใช่ "Redis") ที่ Vercel > Integrations > Marketplace`
  );
}

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

/**
 * แปลงข้อผิดพลาดจากการเขียนไฟล์ ให้บอกได้ว่าต้องทำอะไรต่อ
 *
 * เคยเจอกรณีนี้จริง: deploy บน Vercel แล้วล็อกอินไม่ได้ เพราะไม่ได้ตั้ง
 * KV_REST_API_URL / KV_REST_API_TOKEN ระบบจึงตกไปใช้ที่เก็บแบบไฟล์
 * แต่ /var/task ของ Vercel เป็น read-only ทำให้ทุกคำสั่งที่แตะฐานข้อมูลได้ 500
 * ข้อความดิบคือ EROFS ซึ่งไม่บอกว่าต้องไปตั้ง env อะไร
 */
function explainWriteFail(err: any): Error {
  const code = err?.code;
  if (code === 'EROFS' || code === 'EACCES' || code === 'EPERM' || code === 'ENOSPC') {
    // ติดตั้ง integration ผิดตัว = สาเหตุที่เจอบ่อยกว่า และแก้ผิดที่ถ้าไม่บอก
    if (wrongRedisIntegration) {
      return new Error(explainWrongIntegration());
    }
    return new Error(
      `เขียน ${DB_PATH} ไม่ได้ (${code}) — ตอนนี้ใช้ฐานข้อมูลแบบไฟล์ ซึ่งใช้ได้เฉพาะเครื่องที่เขียนไฟล์ได้ ` +
        `(เช่น เครื่องครูที่รัน npm run dev) ถ้า deploy บน Vercel หรือระบบที่ filesystem เป็น read-only ` +
        `ต้องติดตั้ง integration "Upstash" ที่ Vercel > Integrations > Marketplace ` +
        `(ซึ่งจะใส่ KV_REST_API_URL และ KV_REST_API_TOKEN ให้เอง) ให้ระบบใช้ Redis แทน`
    );
  }
  return err instanceof Error ? err : new Error(String(err));
}

const fileBackend: Backend = {
  label: `ไฟล์ ${DB_PATH}`,
  async load() {
    if (!existsSync(DB_PATH)) {
      try {
        await mkdir(dirname(DB_PATH), { recursive: true });
        await writeFile(DB_PATH, JSON.stringify(seedData(), null, 2), 'utf8');
      } catch (err) {
        throw explainWriteFail(err);
      }
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
    try {
      await writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      throw explainWriteFail(err);
    }
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

const FIRESTORE_COLLECTION = process.env.FIREBASE_FIRESTORE_COLLECTION || 'classquest';
const FIRESTORE_DOC = process.env.FIREBASE_FIRESTORE_DOC || 'db';
const firestorePath = `${FIRESTORE_COLLECTION}/${FIRESTORE_DOC}`;

/**
 * แปลงข้อผิดพลาดจาก Firestore ให้บอกได้ว่าต้องทำอะไรต่อ
 *
 * ⚠️ จุดที่เคยพลาด: load() เดิมกลืน error แล้วคืน seedData() (ฐานข้อมูลว่าง)
 * ซึ่งแย่งกับเงียบ ๆ แต่พอการเขียนครั้งถัดไป docRef.set() จะเขียนทับข้อมูลจริงทิ้ง
 * = ข้อมูลหายจริงโดยที่ไม่มีอะไรฟ้อง
 * ตอนนี้โยน error พร้อมบอกชื่อ env ออกไปแทน ให้เห็นตอนที่ยังไม่มีข้อมูลเสียหาย
 */
function explainFirestoreFail(err: any): Error {
  const detail = err instanceof Error ? err.message : String(err);
  return new Error(
    `ต่อ Firestore (${firestorePath}) ไม่สำเร็จ: ${detail} — ` +
      `ระบบเลือกใช้ Firestore เพราะเจอ credential อยู่ ตรวจว่า FIREBASE_PROJECT_ID, ` +
      `FIREBASE_CLIENT_EMAIL และ FIREBASE_PRIVATE_KEY ถูกต้องและยังไม่หมดอายุ ` +
      `(รวมถึงกฎ Firestore Rules ว่าอนุญาตให้อ่าน/เขียนได้) ` +
      `ถ้าตั้งแต่เครื่องนี้ไม่ได้ ให้ถอด credential ออกเพื่อกลับไปใช้ Redis หรือไฟล์ตามเดิม`
  );
}

const firestoreBackend: Backend = {
  label: `Firebase Firestore (${firestorePath})`,
  async load() {
    const firestore = getFirestoreDb();
    if (!firestore) throw explainFirestoreFail(new Error('ยังไม่ได้เชื่อมต่อ (credential ใช้ไม่ได้)'));
    const docRef = firestore.collection(FIRESTORE_COLLECTION).doc(FIRESTORE_DOC);
    try {
      const snapshot = await docRef.get();
      if (!snapshot.exists) {
        // ยังไม่เคยมีข้อมูลใน Firestore = ครั้งแรก เริ่มจากค่าเริ่มต้น (อ่านจาก data/db.default.json)
        const initial = seedData();
        await docRef.set(initial);
        return initial;
      }
      return normalize(snapshot.data()).data;
    } catch (err) {
      throw explainFirestoreFail(err);
    }
  },
  async save(data) {
    const firestore = getFirestoreDb();
    if (!firestore) throw explainFirestoreFail(new Error('ยังไม่ได้เชื่อมต่อ (credential ใช้ไม่ได้)'));
    const docRef = firestore.collection(FIRESTORE_COLLECTION).doc(FIRESTORE_DOC);
    try {
      await docRef.set(data);
    } catch (err) {
      throw explainFirestoreFail(err);
    }
  },
  // Firestore ไม่มีล็อกแบบ Redis แต่ getDb().write() อ่านของล่าสุดมา merge ก่อนบันทึก
  // จึงยังไม่ทับงานของคนอื่นแบบตรง ๆ (ต่างจากเขียนทับทั้งก้อน)
  locked: async (fn) => fn(),
};

/**
 * เลือกที่เก็บข้อมูล — ลำดับสำคัญ: Redis > Firestore > ไฟล์
 *
 * ทำไม Redis ขึ้นก่อน
 * - ครูเลือก Redis (Vercel KV / Upstash) ไว้แล้ว เพราะ deploy บน Vercel ได้
 * - ถ้า Firestore ชนะก่อน พอตั้ง env ของทั้งสองชุด Firestore จะเงียบ ๆ แย่งไปใช้
 *   แล้วข้อมูลที่อยู่ใน Redis จะหายไปจากหน้าจอโดยไม่มีใครสังเกต
 * - อยากใช้ Firestore แทน? แค่ถอด KV_REST_API_URL / KV_REST_API_TOKEN ออก
 *   ไม่ต้องแก้โค้ดที่นี่
 *
 * ⚠️ ทั้งสองชุดคำนวณค่านี้ตอน import (โมดูลโหลดครั้งเดียว)
 *    แก้ env แล้วต้อง restart เซิร์ฟเวอร์ใหม่ถึงจะมีผล
 */
const backend: Backend = usingKv ? kvBackend : usingFirestore ? firestoreBackend : fileBackend;
export const storeLabel = backend.label;

/**
 * เช็คว่าที่เก็บข้อมูล "เขียนได้" หรือไม่
 *
 * เช็คสิทธิ์อย่างเดียว ไม่เขียนอะไรลงดิสก์จริง
 * ต้องการเพราะเคยเจอกรณีนี้: deploy บน Vercel แล้วทุกอย่างพัง แต่หน้าเว็บยังเปิดได้
 * เพราะหน้าเว็บไม่ได้แตะฐานข้อมูลจนกว่าจะกดล็อกอิน — ถ้ามีค่านี้บอกได้ทันที
 * ว่าเขียนไม่ได้ แทนที่จะต้องไปเดาทีละอย่าง
 */
/** ลองต่อที่เก็บข้อมูลจริง แล้วบอกว่าใช้ได้ไหม (ไม่ใช่แค่เดาจาก env) */
async function probeRemote(probe: () => Promise<unknown>, name: string) {
  try {
    await probe();
    return { writable: true };
  } catch (err: any) {
    return { writable: false, reason: `${name}: ${err?.message || String(err)}` };
  }
}

/** อ่าน Firestore จริงหนึ่งครั้ง (ไม่เขียนอะไร — ต่างจาก firestoreBackend.load() ที่จะสร้าง doc ครั้งแรก) */
async function probeFirestore(): Promise<unknown> {
  const firestore = getFirestoreDb();
  if (!firestore) throw new Error('ยังไม่ได้เชื่อมต่อ (credential ใช้ไม่ได้)');
  return firestore.collection(FIRESTORE_COLLECTION).doc(FIRESTORE_DOC).get();
}

export async function storeWritable(): Promise<{ writable: boolean; reason?: string }> {
  // ⚠️ อย่าเพิ่งตอบว่า writable เฉย ๆ เพราะ "มี env" ไม่ได้แปลว่าใช้ได้
  // เคยเจอการณีนี้: ตั้ง env ครบแต่ credential ผิด/หมดอายุ หน้าเว็บยังเปิดได้
  // ทุกอย่างฟ้องว่าปกติ แต่พอกดแล้ว 500 — ต้องยิงจริงเพื่อให้รู้ตั้งแต่ยังไม่เสียข้อมูล
  if (usingKv) return probeRemote(() => kvCommand(['PING']), 'Redis');
  if (usingFirestore) return probeRemote(probeFirestore, 'Firestore');
  try {
    await access(dirname(DB_PATH), constants.W_OK);
    return { writable: true };
  } catch (err: any) {
    return { writable: false, reason: err?.code || String(err?.message || err) };
  }
}

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
    // อาร์เรย์ที่ไม่มี id ให้เลย (เช่น คู่จับคู่ { a, b }) — รวมทีละรายการไม่ได้
    // เพราะหา "รายการนี้คือรายการเดิม" ไม่ได้ ถ้าบังคับรวมจะทำให้ข้อมูลที่แก้หายเงียบ ๆ
    // จึงต้องเทียบทั้งก้อน คล้ายอาร์เรย์ของค่าพื้นฐาน
    //
    // ⚠️ นี่คือกับดักที่ทำให้ "ข้อมูลหายเงียบ" ได้จริง
    //   ถ้าสองคนเขียนพร้อมกันและแต่ละฝ่ายต่างเพิ่มของตัวเอง ผลคือฝั่งที่เขียนทีหลัง
    //   ทับอาร์เรย์ทั้งก้อนของอีกฝ่าย (return mine) — ของที่อีกคนเพิ่งเพิ่มหายไป
    //   อาการคือ "ครูล็อกอินแล้วถูกเด้งออกจากระบบทันที" โดยไม่มีอะไรฟ้อง
    //   ทางแก้: ทุกอาร์เรย์ที่เขียนพร้อมกันได้ต้องมี id ชัดเจน
    //   (authSessions เคยพลาดตรงนี้ — เพิ่ม id: token ไปแล้ว)
    const hasId = (arr: any): boolean => arr.some((r: any) => idOf(r) !== null);
    if (!hasId(mine) && !hasId(other) && !hasId(Array.isArray(orig) ? orig : [])) {
      if (same(mine, orig)) return other; // เราไม่ได้แก้
      return mine; // เราแก้
    }

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

/** เกมนี้เป็นของครูคนนี้จริงไหม — ฐานของการไม่ให้ข้อมูลข้ามบัญชี */
const isOwned = (row: any, ownerId: string) => Boolean(row) && row.ownerId === ownerId;

/**
 * เกมเป็นของครูคนนี้ไหม
 *
 * ใช้ในทุกฟังก์ชันที่รับ gameId ก่อนแตะข้อมูลที่ผูกกับเกม
 * คืน false ถ้าไม่มีเกมนี้อยู่ด้วย — เพราะ "ไม่มี" กับ "ไม่ใช่ของคุณ" ต้องตอบเหมือนกัน
 * ไม่งั้นคนอื่นจะเดาว่ามีเกม id นี้จริงหรือเปล่า
 */
async function gameBelongsTo(gameId: string, ownerId: string): Promise<boolean> {
  if (!gameId || !ownerId) return false;
  const game = (await getDb()).data.games.find((g: any) => g.id === gameId);
  return isOwned(game, ownerId);
}

export async function createGame(data: any, ownerId: string) {
  const db = await getDb();
  const game = {
    id: uuidv4(),
    ...data,
    ownerId, // กำหนดที่นี่เสมอ ไม่รับจากข้อมูลที่ส่งเข้ามา — ไม่งั้นส่ง ownerId มาเองได้
    status: 'draft',
    roomCode: generateRoomCode(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.data.games.push(game);
  await db.write();
  return game;
}

/**
 * หาเกมโดยไม่ตรวจเจ้าของ — ใช้ได้เฉพาะฝั่งนักเรียนที่เข้าห้องด้วยรหัสห้อง
 *
 * ⚠️ ห้ามใช้ในหน้าของครู ต้องใช้ requireOwnedGame แทน เพราะฟังก์ชันนี้คืนเกมของทุกคน
 */
export const getGame = async (id: string) =>
  (await getDb()).data.games.find((g: any) => g.id === id);

/** เกมของครูคนนี้เท่านั้น — คืน null ถ้าไม่มีหรือไม่ใช่ของครู */
export const getOwnedGame = async (id: string, ownerId: string) => {
  if (!id || !ownerId) return null;
  const game = (await getDb()).data.games.find((g: any) => g.id === id);
  return isOwned(game, ownerId) ? game : null;
};

/**
 * เกมจากรหัสห้อง
 *
 * รหัสห้อง 6 หลักสุ่มใหม่ทุกครั้งที่สร้างเกม จึงถือเป็นตัวแยกแยะได้
 * ข้ามบัญชีไม่ได้ (ยกเว้นเดาชนะ ซึ่งโอกาสต่ำมาก)
 */
export const getGameByRoomCode = async (code: string) =>
  (await getDb()).data.games.find((g: any) => g.roomCode === code);

export const getAllGames = async (ownerId: string) =>
  (await getDb()).data.games.filter((g: any) => isOwned(g, ownerId));

export async function updateGame(id: string, updates: any, ownerId: string) {
  const db = await getDb();
  const i = db.data.games.findIndex((g: any) => g.id === id);
  if (i === -1 || !isOwned(db.data.games[i], ownerId)) return null;
  db.data.games[i] = { ...db.data.games[i], ...updates, updatedAt: new Date().toISOString() };
  await db.write();
  return db.data.games[i];
}

export async function deleteGame(id: string, ownerId: string) {
  const db = await getDb();
  const i = db.data.games.findIndex((g: any) => g.id === id);
  if (i === -1 || !isOwned(db.data.games[i], ownerId)) return false;
  db.data.games.splice(i, 1);
  db.data.missions = db.data.missions.filter((m: any) => m.gameId !== id);
  db.data.players = db.data.players.filter((p: any) => p.gameId !== id);
  db.data.sessions = db.data.sessions.filter((s: any) => s.gameId !== id);
  db.data.teams = db.data.teams.filter((t: any) => t.gameId !== id);
  await db.write();
  return true;
}

// ==================== MISSIONS ====================

export async function createMission(data: any, ownerId: string) {
  if (!(await gameBelongsTo(data.gameId, ownerId))) return null;
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

export async function getMissions(gameId: string, ownerId: string) {
  if (!(await gameBelongsTo(gameId, ownerId))) return [];
  return (await getDb()).data.missions
    .filter((m: any) => m.gameId === gameId)
    .sort((a: any, b: any) => a.order - b.order);
}

/**
 * Mission ที่ใช้เล่นจริง (ไม่รวมด่านบอส) — ใช้จบรอบควิซแล้วค่อยเข้าบอส
 * เรียงตาม order เหมือนการ์ดครูมองเห็น
 */
export async function getQuizMissions(gameId: string, ownerId: string) {
  if (!(await gameBelongsTo(gameId, ownerId))) return [];
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

export const getMission = async (id: string, ownerId: string) => {
  if (!id || !ownerId) return null;
  const db = await getDb();
  const mission = db.data.missions.find((m: any) => m.id === id);
  if (!mission) return null;
  return (await gameBelongsTo(mission.gameId, ownerId)) ? mission : null;
};

export async function updateMission(id: string, updates: any, ownerId: string) {
  const db = await getDb();
  const i = db.data.missions.findIndex((m: any) => m.id === id);
  if (i === -1) return null;
  if (!(await gameBelongsTo(db.data.missions[i].gameId, ownerId))) return null;
  db.data.missions[i] = { ...db.data.missions[i], ...updates, updatedAt: new Date().toISOString() };
  await db.write();
  return db.data.missions[i];
}

export async function deleteMission(id: string, ownerId: string) {
  const db = await getDb();
  const i = db.data.missions.findIndex((m: any) => m.id === id);
  if (i === -1) return false;
  if (!(await gameBelongsTo(db.data.missions[i].gameId, ownerId))) return false;
  db.data.missions.splice(i, 1);
  await db.write();
  return true;
}

// ==================== STUDENTS (รายชื่อนักเรียน) ====================
//
// ⚠️ นักเรียนของแต่ละครูแยกกัน และ "ชื่อเดียวกัน" ของคนละครูต้องไม่ชนกัน
//    ถ้าไม่แยก ครู A จะเห็นนักเรียนของครู B และแก้คะแนนเขาได้

export const getStudents = async (ownerId: string) =>
  (await getDb()).data.students.filter((s: any) => isOwned(s, ownerId));

/**
 * หานักเรียน — ต้องระบุเจ้าของเสมอ
 *
 * มี ownerId เป็นพารามิเตอร์บังคับ (ไม่ optional) เพราะเคยมีช่องโหว่ตรงนี้:
 * หน้าเข้าห้องของนักเรียนรับ studentId มาแล้วเอาไปใช้ตรง ๆ
 * ทำให้นักเรียนของครูหนึ่งเข้าห้องของอีกครูหนึ่งได้
 */
export const getStudent = async (id: string, ownerId: string) => {
  if (!id || !ownerId) return null;
  const found = (await getDb()).data.students.find((s: any) => s.id === id);
  return isOwned(found, ownerId) ? found : null;
};

export const findStudentByName = async (name: string, ownerId: string) => {
  const t = name.trim().toLowerCase();
  return (await getDb()).data.students.find(
    (s: any) => isOwned(s, ownerId) && s.name.trim().toLowerCase() === t
  );
};

function newStudent(name: string, avatar: string, ownerId: string) {
  return {
    id: uuidv4(),
    ownerId,
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

export async function createStudent(data: any, ownerId: string) {
  const db = await getDb();
  const existing = data.name ? await findStudentByName(data.name, ownerId) : undefined;
  if (existing) return existing;
  const student = newStudent(data.name, data.avatar, ownerId);
  db.data.students.push(student);
  await db.write();
  return student;
}

// เพิ่มรายชื่อนักเรียน (ครูเพิ่มเอง)
export async function addStudent(name: string, ownerId: string, avatar = '🦊') {
  const db = await getDb();
  const existing = await findStudentByName(name, ownerId);
  if (existing) return existing;
  const student = newStudent(name, avatar, ownerId);
  db.data.students.push(student);
  await db.write();
  return student;
}

export async function updateStudent(id: string, updates: any, ownerId: string) {
  const db = await getDb();
  const i = db.data.students.findIndex((s: any) => s.id === id);
  if (i === -1) return null;
  if (!isOwned(db.data.students[i], ownerId)) return null;
  // ownerId เปลี่ยนเองไม่ได้ — ถ้าปล่อยไว้ ใครส่งมาก็ย้ายเจ้าของของนักเรียนคนอื่นได้
  const { ownerId: _ignored, ...safe } = updates || {};
  db.data.students[i] = { ...db.data.students[i], ...safe, lastSeenAt: new Date().toISOString() };
  await db.write();
  return db.data.students[i];
}

export async function deleteStudent(id: string, ownerId: string) {
  const db = await getDb();
  const i = db.data.students.findIndex((s: any) => s.id === id);
  if (i === -1) return false;
  if (!isOwned(db.data.students[i], ownerId)) return false;
  db.data.students.splice(i, 1);
  // ลบคะแนน/รอบการเล่นของคนนี้ไปด้วย (กันคะแนนค้างในเกม/รอบที่ลบชื่อไปแล้ว)
  db.data.players = db.data.players.filter((p: any) => p.studentId !== id);
  await db.write();
  return true;
}

// ==================== GROUPS (ห้องเรียน/โฟลเดอร์) ====================

export const getGroups = async (ownerId: string) =>
  (await getDb()).data.groups.filter((g: any) => isOwned(g, ownerId));

export async function addGroup(name: string, ownerId: string) {
  const db = await getDb();
  const trimmed = String(name).trim();
  if (!trimmed) return null;
  const dup = db.data.groups.find(
    (g: any) => isOwned(g, ownerId) && String(g.name).trim() === trimmed
  );
  if (dup) return dup;
  const group = {
    id: uuidv4(),
    ownerId,
    name: trimmed,
    createdAt: new Date().toISOString(),
  };
  db.data.groups.push(group);
  await db.write();
  return group;
}

export async function deleteGroup(id: string, ownerId: string) {
  const db = await getDb();
  const i = db.data.groups.findIndex((g: any) => g.id === id);
  if (i === -1) return false;
  if (!isOwned(db.data.groups[i], ownerId)) return false;
  db.data.groups.splice(i, 1);
  // นักเรียนในห้องนั้นกลับไป "ไม่มีห้อง" — แต่ต้องเป็นของครูคนเดียวกันเท่านั้น
  db.data.students.forEach((s: any) => {
    if (s.groupId === id && isOwned(s, ownerId)) s.groupId = '';
  });
  await db.write();
  return true;
}

export async function getStudentHistory(studentId: string, ownerId: string) {
  const db = await getDb();
  // เช็คเจ้าของก่อน ไม่งั้นใครก็ดูประวัติการเล่นของนักเรียนที่เดา id ได้
  const student = db.data.students.find((s: any) => s.id === studentId);
  if (!isOwned(student, ownerId)) return [];
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
 * - อยู่ในด่านบอส (ควิซผ่านแล้ว) → เลื่อนงานบอส ครบแล้วตีตรา bossDone
 *
 * นับด้วย missionToTasks() แทน questions.length → ด่านที่ไม่ใช่คำถามก็นับได้ถูก
 * (สำหรับด่าน quiz/boss เดิม จำนวนงาน = questions.length เสมอ จึงไม่กระทบข้อมูลเก่า)
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
    const total = missionToTasks(bossMission).length;
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

  // ข้าม Mission ที่ไม่มีงานให้ทำ (ถ้าตัวอยู่จุดนั้น ให้เริ่มงานแรกของ Mission ถัดไป)
  while (mi < quiz.length && missionToTasks(quiz[mi]).length === 0) mi++;
  if (mi >= quiz.length) {
    player.quizDone = true;
    return;
  }
  if (mi !== startMi) qi = 0;

  if (qi + 1 < missionToTasks(quiz[mi]).length) {
    qi += 1;
  } else {
    // หมด Mission นี้ → Mission ถัดไปที่ยังมีงาน
    mi += 1;
    while (mi < quiz.length && missionToTasks(quiz[mi]).length === 0) mi++;
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
//
// ฟังก์ชันนี้ถูกเรียกจากฝั่งนักเรียนตอนตอบคำถาม จึงไม่มี ownerId มาให้
// ต้องหาเจ้าของจากเกมที่ผู้เล่นคนนี้อยู่ — ซึ่งเชื่อถือได้ เพราะผู้เล่นถูกสร้างจากการเข้าห้อง
// ที่ผ่านการตรวจแล้วว่านักเรียนเป็นของครูคนนั้น (ดู POST /api/players)
export async function rollUp(studentId: string | undefined, sessionId: string, player: any) {
  if (!studentId) return;
  const ownerId = (await getGame(player?.gameId))?.ownerId;
  if (!ownerId) return; // ผู้เล่นไม่ผูกกับเกมที่มีเจ้าของ — ไม่แตะข้อมูลนักเรียน
  const student = await getStudent(studentId, ownerId);
  if (!student) return;
  if ((student.completedSessions || []).includes(sessionId)) return;
  await updateStudent(studentId, {
    totalXp: (student.totalXp || 0) + (player.xp || 0),
    gamesPlayed: (student.gamesPlayed || 0) + 1,
    correctAnswers: (student.correctAnswers || 0) + (player.correctAnswers || 0),
    totalAnswers: (student.totalAnswers || 0) + (player.totalAnswers || 0),
    completedSessions: [...(student.completedSessions || []), sessionId],
  }, ownerId);
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

// ==================== บัญชีครู (หลายคน) ====================
//
// ⚠️ กฎของระบบนี้: ทุกอย่างที่ครูเป็นเจ้าของต้องมี ownerId
//   เกม / นักเรียน / กลุ่ม  -> มี ownerId ตรง ๆ
//   ภารกิจ / ผู้เล่น / เซสชันเกม / ทีม -> ไม่ต้องมี เพราะเดินทางผ่านเกมเสมอ
//   แต่ต้อง "ตรวจว่าเกมนั้นเป็นของใคร" ก่อนเสมอ ทุกฟังก์ชันที่รับ gameId
//   จึงบังคับให้ส่ง ownerId มาด้วย — TypeScript จะช่วยตอบให้ว่าลืมตรงไหน
//   ถ้าไม่บังคับ จะมีจุดที่มองข้ามสิทธิ์แล้วไม่รู้ตัว ซึ่งอันตรายกว่าที่คิด

import { hashPassword, verifyPassword, normalizeUsername } from './accounts';

/** บัญชีที่เข้าสู่ระบบได้จริง (มี username + passwordHash) */
export const isUsableAccount = (a: any): a is TeacherAccount =>
  Boolean(a && a.id && a.username && a.passwordHash);

export async function getAccountById(id: string): Promise<TeacherAccount | null> {
  if (!id) return null;
  const found = (await getDb()).data.teachers.find((t: any) => t.id === id);
  return isUsableAccount(found) ? found : null;
}

export async function getAccountByUsername(username: string): Promise<TeacherAccount | null> {
  const key = normalizeUsername(username);
  if (!key) return null;
  const found = (await getDb()).data.teachers.find(
    (t: any) => normalizeUsername(t.username) === key
  );
  return isUsableAccount(found) ? found : null;
}

export async function countAccounts(): Promise<number> {
  return (await getDb()).data.teachers.filter(isUsableAccount).length;
}

/**
 * สมัครบัญชีครูใหม่
 *
 * ครั้งแรกที่มีคนสมัคร ระบบจะดูดข้อมูลเดิม (เกม/นักเรียนที่ครูเคยสร้างไว้ตอนใช้ PIN เดิม)
 * มาผูกให้เขา ไม่งั้นข้อมูลที่ทำไว้เสียเปล่า
 */
export async function registerAccount(input: {
  username: string;
  password: string;
  name: string;
  avatar?: string;
}): Promise<TeacherAccount> {
  const db = await getDb();
  const username = normalizeUsername(input.username);

  if (db.data.teachers.some((t: any) => normalizeUsername(t.username) === username)) {
    throw new Error('ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว ลองชื่ออื่น');
  }

  // บัญชีเดิม (จากยุคใช้ PIN) มี teacher 1 รายการแต่ไม่มีรหัสผ่าน
  // ให้รายนี้กลายเป็นบัญชีจริงแทน แล้วย้ายของเดิมที่ยังไม่มีเจ้าของมาคิดกับเขา
  const legacyIndex = db.data.teachers.findIndex((t: any) => !isUsableAccount(t));
  const id = uuidv4();
  const name = String(input.name || '').trim();
  const account: TeacherAccount = {
    id,
    username,
    name,
    avatar: input.avatar || '👨‍🏫',
    passwordHash: hashPassword(input.password),
    createdAt: new Date().toISOString(),
  };

  if (legacyIndex >= 0) {
    db.data.teachers[legacyIndex] = { ...db.data.teachers[legacyIndex], ...account };
  } else {
    db.data.teachers.push(account);
  }

  // ของที่ยังไม่มีเจ้าของ = ของครูคนแรก (ข้อมูลจากยุคก่อนมีระบบบัญชี)
  const claimed = { games: 0, students: 0, groups: 0 };
  for (const g of db.data.games as any[]) {
    if (!g.ownerId) { g.ownerId = id; claimed.games++; }
  }
  for (const s of db.data.students as any[]) {
    if (!s.ownerId) { s.ownerId = id; claimed.students++; }
  }
  for (const gr of db.data.groups as any[]) {
    if (!gr.ownerId) { gr.ownerId = id; claimed.groups++; }
  }
  (db.data as any).__claimed = claimed;

  await db.write();
  return account;
}

/**
 * ตรวจชื่อผู้ใช้ + รหัสผ่าน
 *
 * คืน null เมื่อไม่ผ่าน โดยไม่บอกว่า "ชื่อผู้ใช้ไม่มี" หรือ "รหัสผ่านผิด"
 * เพราะการบอกต่างกันไปทีละอย่าง เป็นช่องที่ใครก็ไล่เดาชื่อผู้ใช้ที่มีในระบบได้
 */
export async function authenticate(
  username: string,
  password: string
): Promise<TeacherAccount | null> {
  const account = await getAccountByUsername(username);
  if (!account) return null;
  return verifyPassword(password, account.passwordHash) ? account : null;
}

// ---------------- เซสชัน ----------------

export async function createAuthSession(accountId: string): Promise<string> {
  const db = await getDb();
  const now = Date.now();
  const token = randomBytesCompat();
  db.data.authSessions = db.data.authSessions.filter(
    (s) => Date.parse(s.expiresAt) > now
  );
  db.data.authSessions.push({
    id: token,
    token,
    accountId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
  });
  await db.write();
  return token;
}

/**
 * หาบัญชีจากโทเคน — คืน null ถ้าไม่มีหรือหมดอายุ
 *
 * เก็บโทเคนไว้ฝั่งเซิร์ฟเวอร์ (ไม่ใช่คุกกี้แบบเซ็นอย่างเดียว) เพราะต้อง "ออกจากระบบทุกเครื่อง"
 * ได้จริง — ถ้าใช้คุกกี้เซ็นอย่างเดียว ใครขโมยคุกกี้ไปก็ยังใช้ได้ต่อจนหมดอายุ
 */
export async function getAccountByToken(token: string | undefined): Promise<TeacherAccount | null> {
  if (!token) return null;
  const db = await getDb();
  const session = db.data.authSessions.find((s) => s.token === token);
  if (!session) return null;
  if (Date.parse(session.expiresAt) <= Date.now()) {
    db.data.authSessions = db.data.authSessions.filter((s) => s.token !== token);
    await db.write();
    return null;
  }
  const account = db.data.teachers.find((t: any) => t.id === session.accountId);
  return isUsableAccount(account) ? account : null;
}

export async function deleteAuthSession(token: string | undefined): Promise<void> {
  if (!token) return;
  const db = await getDb();
  const before = db.data.authSessions.length;
  db.data.authSessions = db.data.authSessions.filter((s) => s.token !== token);
  if (db.data.authSessions.length !== before) await db.write();
}

export async function updateAccountProfile(
  accountId: string,
  updates: { name?: string; avatar?: string }
): Promise<TeacherAccount | null> {
  const db = await getDb();
  const i = db.data.teachers.findIndex((t: any) => t.id === accountId);
  if (i === -1) return null;
  const current = db.data.teachers[i];
  db.data.teachers[i] = {
    ...current,
    name: updates.name != null ? String(updates.name).trim() : current.name,
    avatar: updates.avatar || current.avatar,
  };
  await db.write();
  return db.data.teachers[i];
}

/**
 * เปลี่ยนรหัสผ่าน
 *
 * บังคับให้ยืนยันรหัสเดิมก่อน ไม่งั้นถ้าโทเคนหลุด (เช่นคนอื่นเปิดหน้าเว็บบนเครื่องครูค้างไว้)
 * ก็จะเปลี่ยนรหัสได้ทันทีโดยครูไม่รู้ตัว
 */
export async function updateAccountPassword(
  accountId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  const db = await getDb();
  const account = db.data.teachers.find((t: any) => t.id === accountId);
  if (!isUsableAccount(account)) return { ok: false, error: 'ไม่พบบัญชี' };
  if (!verifyPassword(currentPassword, account.passwordHash)) {
    return { ok: false, error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' };
  }
  account.passwordHash = hashPassword(newPassword);
  await db.write();
  return { ok: true };
}

/** โทเคนสุ่มแบบ hex — ไม่ใช้ค่าที่คาดเดาได้ */
function randomBytesCompat(): string {
  // ใช้ uuid ที่มีอยู่แล้ว แล้วเติมความยาวด้วยอีกชุด
  return `${uuidv4().replace(/-/g, '')}${uuidv4().replace(/-/g, '')}`;
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
