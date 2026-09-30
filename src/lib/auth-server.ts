// ==================== ตรวจสิทธิ์ฝั่งเซิร์ฟเวอร์ ====================
//
// ไฟล์นี้ถูก import เฉพาะใน API route เท่านั้น เพราะใช้ next/headers
// (ซึ่งรันได้เฉพาะบนเซิร์ฟเวอร์) — db.ts ยัง import ได้ตามปกติจึงไม่พัง
//
// วิธีใช้ใน route:
//   const auth = await requireAccount();
//   if (auth instanceof NextResponse) return auth;   // ยังไม่ล็อกอิน
//   const ownerId = auth.account.id;
//
// ทำไมต้องมี requireOwnedGame ต่างหากจาก requireAccount
// เพราะ "ล็อกอินแล้ว" ไม่พอ ต้องถามต่อว่า "เกมนี้เป็นของคุณไหม" ด้วย
// ถ้าขาดขั้นนี้ ครูที่ล็อกอินได้จะแก้เกมของครูคนอื่นได้ ซึ่งเป็นเรื่องข้อมูลรั่ว

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  getAccountByToken,
  getOwnedGame,
  getGame,
  getGameByRoomCode,
  getPlayer,
  type TeacherAccount,
} from './db';

export const SESSION_COOKIE = 'cq_session';

/**
 * คุกกี้ของนักเรียน = id ผู้เล่น (player) คนนั้น
 *
 * นักเรียนไม่มีบัญชีรหัสผ่าน แต่ยังต้องพิสูจน์ตัวตนบางอย่าง
 * ไม่งั้นใครก็ยิงคำขอแทนคนอื่นได้ (เช่น ขอดูคะแนนเพื่อน, ขอกดเลื่อนข้อแทนเพื่อน)
 * เก็บเป็นคุกกี้ HttpOnly เพราะเก็บแค่ id ไม่ใช่รหัสลับ
 * ถ้าหลุดก็เห็นแค่หมายเลขผู้เล่น ซึ่งยังก้าวก่อนเข้าห้องของคนอื่นไม่ได้
 */
export const STUDENT_COOKIE = 'cq_student';

export function readStudentPlayerId(): string | undefined {
  try {
    return cookies().get(STUDENT_COOKIE)?.value;
  } catch {
    return undefined;
  }
}

export function attachStudentCookie(res: NextResponse, playerId: string): NextResponse {
  res.cookies.set(STUDENT_COOKIE, playerId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });
  return res;
}

/**
 * ผู้เล่นที่ยิงคำขอนี้เป็นใคร (จากคุกกี้) — คืน null ถ้ายังไม่เคยเข้าห้อง
 */
export async function currentPlayer(): Promise<any | null> {
  const id = readStudentPlayerId();
  if (!id) return null;
  return getPlayer(id);
}

/** นักเรียนที่ยังไม่เข้าห้อง — ใช้ตอนตอบคำถาม / เลื่อนข้อ */
export const requirePlayer = async (): Promise<any | NextResponse> => {
  const player = await currentPlayer();
  if (!player) {
    return NextResponse.json(
      { success: false, error: 'ยังไม่ได้เข้าห้อง — กรุณากรอกชื่อเข้าเกมก่อน' },
      { status: 401 }
    );
  }
  return player;
};

/** อ่านโทเคนจากคุกกี้ (คุกกี้มาจากเบราว์เซอร์ อาจไม่มี / หมดอายุแล้ว) */
export function readSessionToken(): string | undefined {
  try {
    return cookies().get(SESSION_COOKIE)?.value;
  } catch {
    return undefined;
  }
}

/** บัญชีที่ล็อกอินอยู่ หรือ null */
export async function getCurrentAccount(): Promise<TeacherAccount | null> {
  return getAccountByToken(readSessionToken());
}

/** ตั้งคุกกี้เซสชัน — ใช้ตอนสมัคร/ล็อกอิน */
export function attachSessionCookie(res: NextResponse, token: string): NextResponse {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, // JS อ่านไม่ได้ -> ถ้ามี XSS ก็ขโมยคุกกี้ไม่ได้
    sameSite: 'lax', // กันเว็บอื่นแนบคำขอแล้วให้เบราว์เซอร์ส่งไปให้
    secure: process.env.NODE_ENV === 'production', // บนเว็บจริงบังคับใช้ https
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });
  return res;
}

/** ลบคุกกี้เซสชัน — ใช้ตอนออกจากระบบ */
export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}

export const unauthorized = () =>
  NextResponse.json(
    { success: false, error: 'ยังไม่ได้เข้าสู่ระบบ — กรุณาล็อกอิน' },
    { status: 401 }
  );

/** ข้อมูลบัญชีที่ล็อกอินอยู่ */
export type Authed = { account: TeacherAccount; ownerId: string };

/**
 * บังคับให้ล็อกอิน — คืน NextResponse 401 ให้ส่งกลับทันที ถ้ายังไม่ล็อกอิน
 *
 * คืนค่าเป็น NextResponse ตรง ๆ (ไม่ใช่ throw) เพราะทุก route มี try/catch อยู่แล้ว
 * การ throw จะถูกจับไปตกเป็น 500 ซึ่งทำให้ "ยังไม่ล็อกอิน" กลายเป็น "เซิร์ฟเวอร์พัง"
 */
export async function requireAccount(): Promise<Authed | NextResponse> {
  const account = await getCurrentAccount();
  if (!account) return unauthorized();
  return { account, ownerId: account.id };
}

/**
 * เกมนี้เป็นของครูที่ล็อกอินอยู่ไหม
 *
 * ตอบ 404 (ไม่ใช่ 403) เพราะถ้าตอบ 403 แปลว่ายืนยันว่า "เกมนี้มีอยู่จริงแต่ไม่ใช่ของคุณ"
 * ซึ่งทำให้คนอื่นยิง id ไปเรื่อย ๆ เพื่อสำรวจว่ามีเกมอะไรบ้างในระบบ
 */
export const notFound = () =>
  NextResponse.json({ success: false, error: 'ไม่พบเกมนี้' }, { status: 404 });

export type AuthedGame = Authed & { game: any };

export async function requireOwnedGame(gameId: string | undefined): Promise<AuthedGame | NextResponse> {
  const auth = await requireAccount();
  if (auth instanceof NextResponse) return auth;
  if (!gameId) {
    return NextResponse.json({ success: false, error: 'ไม่พบ id ของเกม' }, { status: 400 });
  }
  const game = await getOwnedGame(gameId, auth.ownerId);
  if (!game) return notFound();
  return { ...auth, game };
}

/**
 * นักเรียนที่ยิงคำขอนี้อยู่ในเกมนี้จริงไหม
 *
 * ป้องกันการยิง gameId ของห้องอื่น: ถ้าไม่เช็ค ใครก็พิมพ์รหัสเกมของเขาเอง
 * แล้วเห็นรายชื่อคนในห้อง, กดหยุดเวลา, หรือแก้คะแนนได้
 */
export async function requirePlayerInGame(
  gameId: string | undefined
): Promise<{ player: any } | NextResponse> {
  const player = await currentPlayer();
  if (!player) {
    return NextResponse.json(
      { success: false, error: 'ยังไม่ได้เข้าห้อง — กรุณากรอกชื่อเข้าเกมก่อน' },
      { status: 401 }
    );
  }
  if (!gameId || player.gameId !== gameId) return notFound();
  return { player };
}

/**
 * ตัดข้อมูลที่นักเรียนไม่ควรเห็นออกจากเกมก่อนส่งให้
 *
 * ownerId คือ "กุญแจ" ของครู — ถ้าหลุดไป ใครก็เอาไปยิงต่อทางอื่นได้
 * เหตุผลการสร้าง (description) ก็ไม่จำเป็นต่อการเล่น ตัดทิ้งลดข้อมูลรั่ว
 */
export function publicGame(game: any) {
  if (!game) return game;
  const { ownerId, ...rest } = game;
  return rest;
}

/**
 * ตัดข้อมูลที่นักเรียนไม่ควรเห็นออกจาก "นักเรียน 1 คน" ก่อนส่ง
 *
 * ⚠️ เจอตอนยิงเซิร์ฟเวอร์จริงหลัง deploy: GET /api/students คืน ownerId ของครู
 *    ให้คนที่มีรหัสห้องไปอ่านได้ (ตอนนั้นระบบในเครื่องยังไม่มี field นี้
 *    เลยไม่เห็นตอนเทสต์ — ต้องยิงของจริงถึงจะเจอ)
 *
 * ตัด 2 อย่าง:
 * - ownerId         = กุญแจของครู ไม่มีหน้าไหนที่ฝั่งนักเรียนใช้
 * - completedSessions = id ของรอบที่นักเรียนคนนั้นเคยเล่น ไม่จำเป็นต่อการเลือกชื่อ
 *
 * เก็บไว้: id/name/avatar/totalXp/gamesPlayed/correctAnswers/lastSeenAt/groupId
 * (หน้าเลือกชื่อ + หน้าผลวิเคราะห์ใช้)
 */
export function publicStudent<T extends Record<string, any>>(student: T) {
  if (!student) return student;
  const { ownerId, completedSessions, ...rest } = student as Record<string, any>;
  return rest as Omit<T, 'ownerId' | 'completedSessions'>;
}

/** ใช้กับรายชื่อที่อ่านทั้งห้อง (หน้าเลือกชื่อของนักเรียน) */
export function publicStudents<T extends Record<string, any>>(students: T[]) {
  return Array.isArray(students) ? students.map((s) => publicStudent(s)) : [];
}

/**
 * ตัดเฉลยออกจากภารกิจก่อนส่งให้นักเรียน
 *
 * ⚠️ จุดที่เคยรั่ว: /api/missions เปิดสาธารณะมานาน ทำให้นักเรียนอ่าน correctAnswer
 *    ของทุกข้อได้ตั้งแต่ก่อนเริ่มเล่น (เปิด DevTools → ดูเฉลยทันหมด)
 *    ตอนนี้ปิดเฉลยไว้ แล้วให้เซิร์ฟเวอร์เฉลยทีละข้อหลังตอบเสร็จแทน
 *      → ดูคำตอบถูกหลังตอบ: ใช้ correctAnswer ที่ /api/answers ตอบกลับมา
 *
 * เก็บไว้: prompt/options/pairs/unit/explanation เพราะหน้าเล่นต้องใช้วาดหน้าจอ
 * (สำหรับชนิด 'match' เฉลยคือลำดับ 0..n-1 ซึ่งผู้เล่นเห็นจากหน้าจออยู่แล้ว)
 */
export function publicMissions(missions: any[]) {
  if (!Array.isArray(missions)) return [];
  return missions.map((m: any) => ({
    ...m,
    questions: Array.isArray(m?.questions)
      ? m.questions.map((q: any) => {
          const { correctAnswer: _answer, ...rest } = q || {};
          return rest;
        })
      : [],
  }));
}

/**
 * ขอดูข้อมูลเกม — ผ่านได้ทั้งเจ้าของ (เห็นข้อมูลเต็ม) และนักเรียนที่อยู่ในห้องนั้น (เห็นเฉพาะที่จำเป็น)
 *
 * ใช้กับ route ที่ "ฝั่งนักเรียนต้องอ่านได้" เช่น GET /api/games/:id, GET /api/missions
 * requireOwnedGame ใช้ไม่ได้ เพราะนักเรียนไม่มีบัญชีครู
 *
 * isOwner บอก route ว่าจะส่งข้อมูลแบบไหน: เจ้าของได้เต็ม / นักเรียนได้ publicGame + publicMissions
 */
export type GameViewer = { ownerId: string; isOwner: boolean; game: any };

export async function requireGameViewer(
  gameId: string | undefined
): Promise<GameViewer | NextResponse> {
  if (!gameId) {
    return NextResponse.json({ success: false, error: 'ไม่พบ id ของเกม' }, { status: 400 });
  }

  const account = await getCurrentAccount();
  if (account) {
    const owned = await getOwnedGame(gameId, account.id);
    if (owned) return { ownerId: account.id, isOwner: true, game: owned };
  }

  // นักเรียน: ต้องเป็นผู้เล่นที่กำลังอยู่ในเกมนี้จริง (คุกกี้ cq_student ตั้งตอนเข้าห้อง)
  const player = await currentPlayer();
  if (player && player.gameId === gameId) {
    const game = await getGame(gameId);
    if (game) return { ownerId: game.ownerId || '', isOwner: false, game };
  }

  return notFound();
}

/**
 * ยืนยันด้วยรหัสห้อง — ทางออกเดียวของนักเรียนที่ยังไม่ได้เข้าห้อง
 *
 * ตอนก่อนเข้าห้อง นักเรียนยังไม่มีทั้งบัญชีครูและไม่มีคุกกี้ผู้เล่น
 * สิ่งเดียวที่เขามีคือรหัสห้อง 6 หลักที่ครูบอกมา → ใช้ตัวนี้เป็นหลักฐานแทน
 *
 * ⚠️ การเพิ่มชื่อเข้ารายชื่อได้ด้วยรหัสห้อง = ใครมีรหัสห้องก็เพิ่มชื่อได้
 *    เดิมแย่กว่านี้มาก (เพิ่มชื่อลงรายชื่อรวมของทุกคนได้โดยไม่ต้องมีอะไรเลย)
 *    ถ้าภายหลังอยากปิด: ต้องเพิ่มสวิตช์ "เปิดให้เพิ่มชื่อเอง" ต่อเกม
 */
export async function requireRoomCode(
  gameId: string | undefined,
  code: string | null | undefined
): Promise<{ game: any } | NextResponse> {
  if (!gameId || !code) {
    return NextResponse.json(
      { success: false, error: 'ไม่พบรหัสห้อง — กรุณากรอก Room Code อีกครั้ง' },
      { status: 400 }
    );
  }
  const game = await getGameByRoomCode(String(code).toUpperCase().trim());
  // เทียบทั้ง id และรหัสห้อง: ผิวันถ้าส่งมาแค่รหัสห้องของห้องอื่น
  if (!game || game.id !== gameId) return notFound();
  return { game };
}
