// ภารกิจของเกม — เจ้าของเกมเท่านั้น
//
// getMissions/createMission บังคับ ownerId อยู่ใน db.ts แล้ว
// ถ้าเกมไม่ใช่ของครู จะได้ [] / null แทนที่จะเห็นข้อมูลครูอื่น

import { NextResponse } from 'next/server';
import { createMission, getMissions } from '@/lib/db';
import { requireOwnedGame, notFound } from '@/lib/auth-server';
import { errorMessage } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const gameId = new URL(request.url).searchParams.get('gameId') || undefined;
    const auth = await requireOwnedGame(gameId);
    if (auth instanceof NextResponse) return auth;

    const missions = await getMissions(gameId!, auth.ownerId);
    return NextResponse.json({ success: true, data: missions });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'Failed to fetch missions') },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    // gameId มาจาก body ที่ลูกค้าส่งมา จึงต้องตรวจเจ้าของเกมนั้นก่อน
    const auth = await requireOwnedGame(data?.gameId);
    if (auth instanceof NextResponse) return auth;

    const mission = await createMission(data, auth.ownerId);
    if (!mission) return notFound();
    return NextResponse.json({ success: true, data: mission }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'Failed to create mission') },
      { status: 500 }
    );
  }
}
