import { NextResponse } from 'next/server';
import { createPlayer, getPlayers } from '@/lib/db';

// GET players by gameId
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');
    
    if (!gameId) {
      return NextResponse.json(
        { success: false, error: 'gameId is required' },
        { status: 400 }
      );
    }

    const players = await getPlayers(gameId);
    return NextResponse.json({ success: true, data: players });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch players' },
      { status: 500 }
    );
  }
}

// POST create new player
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const player = await createPlayer(data);
    return NextResponse.json({ success: true, data: player }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create player' },
      { status: 500 }
    );
  }
}
