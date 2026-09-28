import { NextResponse } from 'next/server';
import {
  createPlayer,
  getPlayers,
  getSession,
  createSession,
  getStudent,
  updateStudent,
} from '@/lib/db';

// GET ผู้เล่นในห้อง (รอบปัจจุบัน)
export async function GET(request: Request) {
  try {
    const gameId = new URL(request.url).searchParams.get('gameId');
    if (!gameId) {
      return NextResponse.json({ success: false, error: 'gameId is required' }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: await getPlayers(gameId) });
  } catch {
    return NextResponse.json({ success: false, error: 'โหลดผู้เล่นไม่สำเร็จ' }, { status: 500 });
  }
}

// POST นักเรียนเข้าร่วมห้อง
export async function POST(request: Request) {
  try {
    const { gameId, studentId } = await request.json();
    if (!gameId || !studentId) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบ' }, { status: 400 });
    }

    const student = await getStudent(studentId);
    if (!student) {
      return NextResponse.json({ success: false, error: 'ไม่พบนักเรียน' }, { status: 404 });
    }

    let session = await getSession(gameId);
    if (!session) session = await createSession(gameId);

    // เข้าห้องเดิมแล้ว → ไม่สร้างซ้ำ
    const existing = (await getPlayers(gameId)).find((p: any) => p.studentId === student.id);
    if (existing) {
      return NextResponse.json({ success: true, data: existing, alreadyIn: true });
    }

    const player = await createPlayer({
      gameId,
      sessionId: session.id,
      studentId: student.id,
      name: student.name,
      avatar: student.avatar,
    });

    await updateStudent(student.id, {});

    return NextResponse.json({ success: true, data: player }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: 'เข้าร่วมห้องไม่สำเร็จ' }, { status: 500 });
  }
}
