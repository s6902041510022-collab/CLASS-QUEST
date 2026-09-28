import { NextResponse } from 'next/server';
import { getDb, advancePlayerPosition } from '@/lib/db';

// POST /api/players/advance → เลื่อนนักเรียนไปข้อถัดไป (ใช้ตอนตอบผิดกด "ไปข้อถัดไป" หรือหมดเวลา)
// ตอบถูกจะเลื่อนให้อัตโนมัติใน /api/answers แล้ว
export async function POST(request: Request) {
  try {
    const { playerId } = await request.json();
    if (!playerId) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบ' }, { status: 400 });
    }

    const db = await getDb();
    const player = db.data.players.find((p: any) => p.id === playerId);
    if (!player) {
      return NextResponse.json({ success: false, error: 'ไม่พบผู้เล่น' }, { status: 404 });
    }

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
  } catch {
    return NextResponse.json({ success: false, error: 'เลื่อนข้อไม่สำเร็จ' }, { status: 500 });
  }
}