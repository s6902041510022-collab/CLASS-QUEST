// ==================== ผู้เล่นในห้อง ====================
//
// route นี้ถูกใช้สองฝั่ง จึงต้องแยกสิทธิ์ให้ชัด
//
// ครู   — ต้องเป็นเจ้าของเกม (ดูรายชื่อในห้องของตัวเองเพื่อคิดคะแนน)
// นักเรียน — ดูได้แค่ห้องที่ตัวเองอยู่ และดูได้แค่ตัวเอง
//
// ⚠️ เดิมเปิดสาธารณะ — พิมพ์ gameId ของใครก็เห็นรายชื่อทั้งห้องได้
//
// นักเรียนเข้าห้องโดยส่ง studentId มา ซึ่งเดิมเป็นช่องโหว่:
//   นักเรียนของครู A ส่ง studentId ตัวเอง + gameId ของครู B เข้าห้องได้
//   แก้แล้วด้วยการเช็คว่านักเรียนเป็นของเจ้าของเกมนั้นจริง

import { NextResponse } from 'next/server';
import {
  createPlayer,
  getPlayers,
  getSession,
  createSession,
  getStudent,
  updateStudent,
  getGame,
  getPlayer,
} from '@/lib/db';
import {
  requireOwnedGame,
  requirePlayerInGame,
  currentPlayer,
  getCurrentAccount,
  attachStudentCookie,
  unauthorized,
  notFound,
} from '@/lib/auth-server';
import { getOwnedGame } from '@/lib/db';
import { errorMessage } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

// GET ผู้เล่นในห้อง (รอบปัจจุบัน) หรือระบุ id เพื่อเอารายเดียว (แก้ไขโหมด self-paced)
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const singleId = url.searchParams.get('id');
    const account = await getCurrentAccount();

    if (singleId) {
      // นักเรียนดูตัวเองได้ / ครูดูผู้เล่นในเกมตัวเองได้
      const me = await currentPlayer();
      if (me && me.id === singleId) {
        return NextResponse.json({ success: true, data: me });
      }
      // ครู: ต้องเป็นเจ้าของเกมที่ผู้เล่นคนนั้นอยู่ (ไม่ใช่แค่ "มีคุกกี้ครู")
      if (account) {
        const player = await getPlayer(singleId);
        if (!player) return notFound();
        const owned = player.gameId ? await getOwnedGame(player.gameId, account.id) : null;
        if (!owned) return notFound();
        return NextResponse.json({ success: true, data: player });
      }
      return unauthorized();
    }

    const gameId = url.searchParams.get('gameId') || undefined;

    // ครู: ต้องเป็นเจ้าของเกม
    //
    // ⚠️ ต้องเช็ค "เป็นเจ้าของจริงไหม" ไม่ใช่แค่ "มีคุกกี้ครูไหม"
    //    ครูที่ล็อกอินค้างไว้ (ทดสอบหน้านักเรียนบนเครื่องตัวเอง หรือเครื่องคลาสที่ครูคนอื่นล็อกอินไว้)
    //    เดิมติด requireOwnedGame → ได้ 404 → หน้าล็อบี้มองเป็น "ยังไม่มีใครเข้าร่วม"
    //    นักเรียนที่เพิ่งเข้าห้องจริง ๆ ก็เลยหายไปจากหน้าจอ
    if (account) {
      const owned = gameId ? await getOwnedGame(gameId, account.id) : null;
      if (owned) {
        return NextResponse.json({ success: true, data: await getPlayers(gameId!) });
      }
      // ไม่ใช่เกมของครูคนนี้ → ตกไปลองทางนักเรียนต่อ (ต้องมีคุกกี้ผู้เล่นในห้องนั้นจริง)
    }

    // นักเรียน: ต้องอยู่ในห้องนั้นจริง
    const inGame = await requirePlayerInGame(gameId);
    if (inGame instanceof NextResponse) return inGame;
    return NextResponse.json({ success: true, data: await getPlayers(gameId!) });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'โหลดผู้เล่นไม่สำเร็จ') },
      { status: 500 }
    );
  }
}

// POST นักเรียนเข้าร่วมห้อง
export async function POST(request: Request) {
  try {
    const { gameId, studentId } = await request.json();
    if (!gameId || !studentId) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบ' }, { status: 400 });
    }

    // เกมต้องมีอยู่จริง — ไม่งั้นเข้าห้องลอย ๆ ได้
    const game = await getGame(gameId);
    if (!game || !game.ownerId) {
      return NextResponse.json({ success: false, error: 'ไม่พบห้องนี้' }, { status: 404 });
    }

    // 🔑 จุดที่เคยรั่ว: ต้องเป็นนักเรียนของครูเจ้าของเกมนี้เท่านั้น
    // ไม่งั้นนักเรียนของครูหนึ่งเข้าห้องของอีกครูหนึ่งได้
    const student = await getStudent(studentId, game.ownerId);
    if (!student) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบชื่อนี้ในห้องเรียน' },
        { status: 404 }
      );
    }

    // 🔑 จุดที่ทำให้นักเรียนหลุดไปหน้าผลวิเคราะห์ทันทีที่เลือกชื่อ
    //    getSession คืน "รอบล่าสุด" แม้ที่รอบนั้นปิดไปแล้ว → นักเรียนที่เพิ่งเข้ามา
    //    ถูกผนวกเข้ากับรอบที่จบแล้ว แล้วหน้าล็อบี้ก็เห็น status = 'completed'
    //    แล้วพาไปหน้าผลวิเคราะห์ทันที ทั้งที่ยังไม่ได้เล่นสักข้อ
    //    (แก้ชื่อแล้วเข้าใหม่ก็โดนอีก เพราะรอบเก่ายังค้างสถานะ completed อยู่)
    //    แก้โดย: รอบที่ปิดแล้วต้องเปิดห้องรอใหม่เสมอ ไม่งั้นคนเพิ่งมาจะติดรอบตาย
    let session = await getSession(gameId);
    if (!session || session.status === 'completed') {
      // ไม่ใส่ force: ถ้ามีนักเรียนคนที่สองเข้าตามมา ให้เข้าห้องรอเดียวกัน
      // (createSession คืนรอบที่ยังเปิดอยู่ถ้ามี จะได้ไม่เพิ่มรอบเปล่า ๆ)
      session = await createSession(gameId);
    }

    // เข้าห้องเดิมแล้ว → ไม่สร้างซ้ำ
    const existing = (await getPlayers(gameId)).find((p: any) => p.studentId === student.id);
    if (existing) {
      return attachStudentCookie(
        NextResponse.json({ success: true, data: existing, alreadyIn: true }),
        existing.id
      );
    }

    const player = await createPlayer({
      gameId,
      sessionId: session.id,
      studentId: student.id,
      name: student.name,
      avatar: student.avatar,
    });

    await updateStudent(student.id, {}, game.ownerId);

    // จำว่าเป็น "ผู้เล่น" คนนี้ ทางเซิร์ฟเวอร์
    // เพื่อให้ตอบคำถาม/เลื่อนข้อได้ โดยไม่ต้องส่ง studentId ไปทุกครั้ง
    return attachStudentCookie(
      NextResponse.json({ success: true, data: player }, { status: 201 }),
      player.id
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'เข้าร่วมห้องไม่สำเร็จ') },
      { status: 500 }
    );
  }
}
