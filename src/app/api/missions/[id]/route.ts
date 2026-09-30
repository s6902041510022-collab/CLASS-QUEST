// ภารกิจเดียว — เจ้าของเกมเท่านั้น
//
// ภารกิจไม่มี ownerId ตรง ๆ แต่ทุกภารกิจผูกกับเกม
// db.ts จึงเดินตาม gameId ไปเช็คเจ้าของเกมให้ (getMission รับ ownerId เพิ่ม)

import { NextResponse } from 'next/server';
import { getMission, updateMission, deleteMission } from '@/lib/db';
import { requireAccount, notFound } from '@/lib/auth-server';
import { errorMessage } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAccount();
    if (auth instanceof NextResponse) return auth;

    const mission = await getMission(params.id, auth.ownerId);
    if (!mission) return notFound();
    return NextResponse.json({ success: true, data: mission });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'Failed to fetch mission') },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAccount();
    if (auth instanceof NextResponse) return auth;

    const data = await request.json();
    const mission = await updateMission(params.id, data, auth.ownerId);
    if (!mission) return notFound();
    return NextResponse.json({ success: true, data: mission });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'Failed to update mission') },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAccount();
    if (auth instanceof NextResponse) return auth;

    const success = await deleteMission(params.id, auth.ownerId);
    if (!success) return notFound();
    return NextResponse.json({ success: true, message: 'Mission deleted' });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'Failed to delete mission') },
      { status: 500 }
    );
  }
}
