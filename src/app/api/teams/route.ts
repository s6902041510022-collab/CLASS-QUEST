// ทีม — เฉพาะเจ้าของเกม
//
// เดิมเปิดสาธารณะ ใครก็สร้าง/อ่านทีมของเกมได้ด้วยแค่ gameId
// (ตอนนี้ยังไม่มีหน้าเว็บไหนเรียกใช้ แต่ปิดไว้ก่อนใครไปเจอแล้วใช้)

import { NextResponse } from 'next/server';
import { createTeams, getTeams } from '@/lib/db';
import { requireOwnedGame, notFound } from '@/lib/auth-server';
import { errorMessage } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const gameId = new URL(request.url).searchParams.get('gameId') || undefined;
    const auth = await requireOwnedGame(gameId);
    if (auth instanceof NextResponse) return auth;

    const teams = await getTeams(gameId!);
    return NextResponse.json({ success: true, data: teams });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'Failed to fetch teams') },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { gameId, count } = await request.json();
    const auth = await requireOwnedGame(gameId);
    if (auth instanceof NextResponse) return auth;

    const teams = await createTeams(gameId, count);
    if (!teams) return notFound();
    return NextResponse.json({ success: true, data: teams }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'Failed to create teams') },
      { status: 500 }
    );
  }
}
