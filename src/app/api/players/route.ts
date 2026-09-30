import { NextResponse } from 'next/server';
import {
  createPlayer,
  getPlayers,
  getSession,
  createSession,
  getStudent,
  updateStudent,
  getDb,
} from '@/lib/db';
import { errorMessage } from '@/lib/api-error';

// GET ผู้เล่นในห้อง (รอบปัจจุบัน) หรือระบุ id เพื่อเอารายเดียว (แก้ไขโหมด self-paced)
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const singleId = url.searchParams.get('id');
    if (singleId) {
      const player = (await getDb()).data.players.find((p: any) => p.id === singleId);
      if (!player) {
        return NextResponse.json({ success: false, error: 'ไม่พบผู้เล่น' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: player });
    }
    const gameId = url.searchParams.get('gameId');
    if (!gameId) {
      return NextResponse.json({ success: false, error: 'gameId is required' }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: await getPlayers(gameId) });
  } catch (err) {
    return NextResponse.json({ success: false, error: errorMessage(err, 'โหลดผู้เล่นไม่สำเร็จ') }, { status: 500 });
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
  } catch (err) {
    return NextResponse.json({ success: false, error: errorMessage(err, 'เข้าร่วมห้องไม่สำเร็จ') }, { status: 500 });
  }
}
