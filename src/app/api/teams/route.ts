import { NextResponse } from 'next/server';
import { createTeams, getTeams } from '@/lib/db';

// GET teams by gameId
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

    const teams = await getTeams(gameId);
    return NextResponse.json({ success: true, data: teams });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}

// POST create teams
export async function POST(request: Request) {
  try {
    const { gameId, count } = await request.json();
    const teams = await createTeams(gameId, count);
    return NextResponse.json({ success: true, data: teams }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create teams' },
      { status: 500 }
    );
  }
}
