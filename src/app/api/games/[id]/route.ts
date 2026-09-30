// เกมเดียว — อ่านได้ทั้งเจ้าของและนักเรียนที่อยู่ในห้อง / แก้-ลบได้เฉพาะเจ้าของ
//
// requireOwnedGame คืน 404 (ไม่ใช่ 403) เมื่อไม่ใช่ของครู
// เพราะถ้าตอบ 403 แปลว่ายืนยันว่า "เกมนี้มีอยู่จริง" ใครก็ยิง id ไปเรื่อย ๆ
// เพื่อสำรวจว่ามีเกมอะไรบ้างในระบบ
//
// ⚠️ GET ต้องเปิดให้นักเรียนที่อยู่ในห้องด้วย ไม่งั้นหน้าเกม/หน้าล็อบี้โหลดไม่ขึ้น
//    (นักเรียนไม่มีบัญชีครู จึงผ่าน requireOwnedGame ไม่ได้เด็ดขาด)

import { NextResponse } from 'next/server';
import { updateGame, deleteGame } from '@/lib/db';
import { requireOwnedGame, requireGameViewer, publicGame } from '@/lib/auth-server';
import { errorMessage } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const view = await requireGameViewer(params.id);
    if (view instanceof NextResponse) return view;
    // นักเรียนได้ข้อมูลเกมแบบไม่มี ownerId (ownerId คือกุญแจของครู)
    return NextResponse.json({
      success: true,
      data: view.isOwner ? view.game : publicGame(view.game),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'Failed to fetch game') },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireOwnedGame(params.id);
    if (auth instanceof NextResponse) return auth;

    const data = await request.json();
    const game = await updateGame(params.id, data, auth.ownerId);
    if (!game) {
      return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: game });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'Failed to update game') },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireOwnedGame(params.id);
    if (auth instanceof NextResponse) return auth;

    const success = await deleteGame(params.id, auth.ownerId);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Game deleted' });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'Failed to delete game') },
      { status: 500 }
    );
  }
}
