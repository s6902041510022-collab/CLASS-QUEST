// เกมของครูที่ล็อกอินอยู่เท่านั้น
//
// ⚠️ เดิม route นี้เปิดสาธารณะ — ใครก็ POST/DELETE เกมได้
//    ตอนนี้ต้องล็อกอิน และเห็นแค่เกมของตัวเอง (getAllGames กรองด้วย ownerId)

import { NextResponse } from 'next/server';
import { createGame, getAllGames } from '@/lib/db';
import { requireAccount } from '@/lib/auth-server';
import { errorMessage } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await requireAccount();
    if (auth instanceof NextResponse) return auth;
    const games = await getAllGames(auth.ownerId);
    return NextResponse.json({ success: true, data: games });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'Failed to fetch games') },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAccount();
    if (auth instanceof NextResponse) return auth;

    const data = await request.json();
    // createGame กำหนด ownerId เองจากพารามิเตอร์ ไม่รับจาก body
    // ถ้ารับจาก body ใครก็ยิง ownerId ของครูอื่นมาแล้วเข้าถึงเกมเขาได้
    const game = await createGame(data, auth.ownerId);
    return NextResponse.json({ success: true, data: game }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'Failed to create game') },
      { status: 500 }
    );
  }
}
