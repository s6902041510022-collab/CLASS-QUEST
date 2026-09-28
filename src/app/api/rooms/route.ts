import { NextResponse } from 'next/server';
import { getGameByRoomCode } from '@/lib/db';

// GET game by room code
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

    const game = await getGameByRoomCode(code.toUpperCase());
    
    if (!game) {
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: game });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch room' },
      { status: 500 }
    );
  }
}
