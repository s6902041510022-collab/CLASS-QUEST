import { NextResponse } from 'next/server';
import { getMission, updateMission, deleteMission } from '@/lib/db';
import { errorMessage } from '@/lib/api-error';

// GET single mission
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const mission = await getMission(params.id);
    if (!mission) {
      return NextResponse.json(
        { success: false, error: 'Mission not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: mission });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'Failed to fetch mission') },
      { status: 500 }
    );
  }
}

// PUT update mission
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const mission = await updateMission(params.id, data);
    if (!mission) {
      return NextResponse.json(
        { success: false, error: 'Mission not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: mission });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'Failed to update mission') },
      { status: 500 }
    );
  }
}

// DELETE mission
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const success = await deleteMission(params.id);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Mission not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, message: 'Mission deleted' });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'Failed to delete mission') },
      { status: 500 }
    );
  }
}
