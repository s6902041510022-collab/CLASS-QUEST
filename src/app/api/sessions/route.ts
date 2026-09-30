import { NextResponse } from 'next/server';
import {
  createSession,
  getSession,
  updateSessionLive,
  getPlayers,
  rollUp,
  settleBossDefeat,
} from '@/lib/db';
import { errorMessage } from '@/lib/api-error';

export async function GET(request: Request) {
  try {
    const gameId = new URL(request.url).searchParams.get('gameId');
    if (!gameId) {
      return NextResponse.json({ success: false, error: 'gameId is required' }, { status: 400 });
    }
    // โอกาสสุดท้ายให้ "บอสที่ตายแล้ว" ปิดรอบเมื่อเลยช่วงลมจับ (ครู/นักเรียน poll มาเรื่อยๆ)
    await settleBossDefeat(gameId);
    return NextResponse.json({ success: true, data: await getSession(gameId) });
  } catch (err) {
    return NextResponse.json({ success: false, error: errorMessage(err, 'โหลดสถานะไม่สำเร็จ') }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { gameId, force } = await request.json();
    if (!gameId) {
      return NextResponse.json({ success: false, error: 'gameId is required' }, { status: 400 });
    }
    // force = true คือครูกดเริ่มรอบใหม่ (ล้างผู้เล่นเก่า) ไม่ระบุ = ใช้ห้องที่ยังเปิดอยู่
    const session = await createSession(gameId, { force: Boolean(force) });
    return NextResponse.json({ success: true, data: session }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: errorMessage(err, 'เริ่มเกมไม่สำเร็จ') }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { gameId, ...updates } = await request.json();
    if (!gameId) {
      return NextResponse.json({ success: false, error: 'gameId is required' }, { status: 400 });
    }
    const session = await updateSessionLive(gameId, updates);
    if (!session) {
      return NextResponse.json({ success: false, error: 'ยังไม่มีห้องเล่น' }, { status: 404 });
    }

    // จบเกม → นำคะแนนเข้าสถิติถาวรของนักเรียน (กันซ้ำด้วย completedSessions)
    if (updates.status === 'completed') {
      const players = await getPlayers(gameId);
      for (const p of players) {
        await rollUp(p.studentId, session.id, p);
      }
    }
    return NextResponse.json({ success: true, data: session });
  } catch (err) {
    return NextResponse.json({ success: false, error: errorMessage(err, 'ทำรายการไม่สำเร็จ') }, { status: 500 });
  }
}
