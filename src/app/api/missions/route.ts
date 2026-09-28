import { NextResponse } from 'next/server';
import { createMission, getMissions } from '@/lib/db';

// GET missions by gameId
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

    const missions = await getMissions(gameId);
    return NextResponse.json({ success: true, data: missions });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch missions' },
      { status: 500 }
    );
  }
}

// POST create new mission
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const mission = await createMission(data);
    return NextResponse.json({ success: true, data: mission }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create mission' },
      { status: 500 }
    );
  }
}
