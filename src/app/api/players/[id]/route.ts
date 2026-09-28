import { NextResponse } from 'next/server';
import { getPlayer, updatePlayer } from '@/lib/db';

// GET single player
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const player = await getPlayer(params.id);
    if (!player) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: player });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch player' },
      { status: 500 }
    );
  }
}

// PUT update player
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const player = await updatePlayer(params.id, data);
    if (!player) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: player });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update player' },
      { status: 500 }
    );
  }
}
