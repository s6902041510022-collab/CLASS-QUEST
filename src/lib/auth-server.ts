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
import { getAccountByToken, getOwnedGame, getPlayer, type TeacherAccount } from './db';

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
