import { NextResponse } from 'next/server';
import { createGame, getAllGames, getGame, updateGame, deleteGame } from '@/lib/db';

// GET all games
export async function GET() {
  try {
    const games = await getAllGames();
    return NextResponse.json({ success: true, data: games });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch games' },
      { status: 500 }
    );
  }
}

// POST create new game
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const game = await createGame(data);
    return NextResponse.json({ success: true, data: game }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create game' },
      { status: 500 }
    );
  }
}
