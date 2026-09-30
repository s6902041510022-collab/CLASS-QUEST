// ค้นหาห้องจากรหัสห้อง — ฝั่งนักเรียน (ยังไม่มีบัญชี)
//
// เปิดสาธารณะโดยเจตนา เพราะรหัสห้อง 6 หลักคือ "กุญแจ" ที่ครูบอกนักเรียน
//
// ⚠️ แต่ต้องไม่ส่ง ownerId กลับไป — นั่นคือกุญแจของครู
//    ถ้าหลุด ใครก็เอาไปยิงต่อทางอื่น (ดู requireOwnedGame ที่ใช้ ownerId เป็นเงื่อนไข)

import { NextResponse } from 'next/server';
import { getGameByRoomCode } from '@/lib/db';
import { publicGame } from '@/lib/auth-server';
import { errorMessage } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Room code is required' },
        { status: 400 }
      );
    }

    const game = await getGameByRoomCode(code.toUpperCase().trim());

    if (!game) {
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: publicGame(game) });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'Failed to fetch room') },
      { status: 500 }
    );
  }
}
