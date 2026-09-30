// เลื่อนนักเรียนไปข้อถัดไป (ตอบผิดกด "ไปข้อถัดไป" หรือหมดเวลา)
// ตอบถูกจะเลื่อนให้อัตโนมัติใน /api/answers แล้ว
//
// ⚠️ เดิมรับ playerId จากที่ลูกค้าส่งมา — ใครก็เลื่อนข้อแทนเพื่อนได้
//    (ถ้ายังไม่เข้าห้อง เลื่อนไปท้ายสุด = ข้ามคำถามฟรี)

import { NextResponse } from 'next/server';
import { getDb, advancePlayerPosition } from '@/lib/db';
import { currentPlayer, notFound } from '@/lib/auth-server';
import { errorMessage } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { playerId } = await request.json();
    if (!playerId) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบ' }, { status: 400 });
    }

    // ต้องเป็นผู้เล่นที่ยิงคำขอนี้จริง ไม่ใช่แค่บอก id มา
    const me = await currentPlayer();
    if (!me || me.id !== playerId) {
      return NextResponse.json(
        { success: false, error: 'ยังไม่ได้เข้าห้อง — กรุณากรอกชื่อเข้าเกมใหม่' },
        { status: 401 }
      );
    }

    const db = await getDb();
    const player = db.data.players.find((p: any) => p.id === playerId);
    if (!player) return notFound();

    advancePlayerPosition(db, player);
    await db.write();

    return NextResponse.json({
      success: true,
      data: {
        posMission: Number(player.posMission) || 0,
        posQuestion: Number(player.posQuestion) || 0,
        quizDone: Boolean(player.quizDone),
        bossPos: Number(player.bossPos) || 0,
        bossDone: Boolean(player.bossDone),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'เลื่อนข้อไม่สำเร็จ') },
      { status: 500 }
    );
  }
}
