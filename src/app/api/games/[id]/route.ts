import { NextResponse } from 'next/server';
import { getGame, updateGame, deleteGame } from '@/lib/db';

// GET single game
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const game = await getGame(params.id);
    if (!game) {
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: game });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch game' },
      { status: 500 }
    );
  }
}

// PUT update game
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const game = await updateGame(params.id, data);
    if (!game) {
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: game });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update game' },
      { status: 500 }
    );
  }
}

// DELETE game
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const success = await deleteGame(params.id);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, message: 'Game deleted' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete game' },
      { status: 500 }
    );
  }
}
