// รายชื่อนักเรียน — อ่านได้ทั้งครูเจ้าของ และนักเรียนที่กำลังจะเข้าห้อง
//
// ⚠️ จุดที่เคยพัง: ทั้งสอง method เคยบังคับให้ล็อกอินเป็นครู ทำให้นักเรียน
//    เข้าเกมไม่ได้เลย (หน้า /student/join พังตั้งแต่ขั้นเลือกชื่อ)
//    นักเรียนไม่มีบัญชีครู จึงต้องมีทางเข้าเป็นนักเรียนด้วย
//
// ทางเข้าของนักเรียน = รหัสห้อง 6 หลัก (ของที่ครูบอก) + gameId ที่ตรงกัน
//   เพราะยังไม่มีทั้งบัญชีและคุกกี้ผู้เล่น จึงยืนยันตัวตนด้วยรหัสห้องอย่างเดียว
//   เดิมเปิดให้ทั้งระบบโดยไม่มีอะไรเลย (เห็น/เพิ่มชื่อได้ทุกคน) → นี่แย่กว่าเดิมแน่นอน
//
// addStudent ต้องรับ ownerId เป็นพารามิเตอร์ที่สอง (ตอนนี้เป็น avatar)
// เพราะชื่อนักเรียนเดียวกันของคนละครูต้องไม่ชนกัน

import { NextResponse } from 'next/server';
import { getStudents, addStudent, getGame } from '@/lib/db';
import { getCurrentAccount, requireRoomCode } from '@/lib/auth-server';
import { errorMessage } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

/**
 * หา ownerId ที่จะเขียน/อ่านรายชื่อ
 * - ครูที่ล็อกอิน → เจ้าของตัวเอง (ไม่ต้องส่งอะไรมา)
 * - นักเรียน → ต้องมี gameId + roomCode ที่ตรงกัน
 * คืน NextResponse 401 ถ้าทั้งสองทางไม่ผ่าน
 *
 * ⚠️ เคยพัง: ครูที่ยังล็อกอินค้างไว้ (ของครูเอง หรือของคนอื่นในเครื่องเดียวกัน)
 *    แล้วเปิดหน้านักเรียน → เดิมโค้ดเช็คคุกกี้ครูก่อนเสมอ
 *    ผลคือของตัวครูเอง (ซึ่งอาจไม่มีนักเรียนเลย) → หน้าเลือกชื่อโชว์ "ไม่พบชื่อที่ค้นหา"
 *    เข้าเกมไม่ได้เลย ทั้งที่รหัสห้องถูกต้อง
 *    แก้โดย: ถ้ามี gameId ส่งมา = "ผมกำลังทำตัวเป็นนักเรียนของห้องนี้"
 *    ให้ยึดห้องที่ระบุเป็นหลัก และใช้สิทธิ์ครูเฉพาะตอนที่เกมนั้นเป็นของครูคนนั้นจริง
 */
async function resolveOwner(
  search: URLSearchParams,
  body?: any
): Promise<{ ownerId: string; isTeacher: boolean } | NextResponse> {
  const gameId = body?.gameId ?? search.get('gameId') ?? undefined;
  const roomCode = body?.roomCode ?? search.get('roomCode') ?? null;

  const account = await getCurrentAccount();
  if (account) {
    if (!gameId) return { ownerId: account.id, isTeacher: true };
    const mine = await getGame(gameId);
    if (mine && mine.ownerId === account.id) {
      return { ownerId: account.id, isTeacher: true };
    }
    // เกมไม่ใช่ของครูคนนี้ → ตกไปใช้ทางนักเรียน (ต้องมีรหัสห้องตรงกัน)
  }

  const room = await requireRoomCode(gameId, roomCode);
  if (room instanceof NextResponse) return room;
  return { ownerId: room.game.ownerId || '', isTeacher: false };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = await resolveOwner(searchParams);
    if (owner instanceof NextResponse) return owner;
    return NextResponse.json({ success: true, data: await getStudents(owner.ownerId) });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'โหลดรายชื่อไม่สำเร็จ') },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const owner = await resolveOwner(new URL(request.url).searchParams, body);
    if (owner instanceof NextResponse) return owner;

    const { name, avatar, names } = body;

    // เพิ่มทีละคน หรือเพิ่มเป็นชุด (วางรายชื่อทั้งห้อง) — เฉพาะครูเท่านั้น
    if (Array.isArray(names)) {
      if (!owner.isTeacher) {
        return NextResponse.json(
          { success: false, error: 'เพิ่มรายชื่อเป็นชุดได้เฉพาะครูเท่านั้น' },
          { status: 403 }
        );
      }
      const added = [];
      for (const n of names.map((s: any) => String(s).trim()).filter(Boolean)) {
        added.push(await addStudent(n, owner.ownerId));
      }
      return NextResponse.json({ success: true, data: added, count: added.length });
    }

    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, error: 'กรอกชื่อนักเรียน' }, { status: 400 });
    }
    const student = await addStudent(String(name), owner.ownerId, avatar);
    return NextResponse.json({ success: true, data: student }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'เพิ่มรายชื่อไม่สำเร็จ') },
      { status: 500 }
    );
  }
}
