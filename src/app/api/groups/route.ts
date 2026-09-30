// ห้องเรียน (โฟลเดอร์) — เฉพาะของครูที่ล็อกอิน
//
// ห้องเรียนชื่อซ้ำกันได้คนละครู เพราะ addGroup เช็คซ้ำเฉพาะในของครูคนเดียวกัน

import { NextResponse } from 'next/server';
import { getGroups, addGroup, deleteGroup } from '@/lib/db';
import { requireAccount, notFound } from '@/lib/auth-server';
import { errorMessage } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await requireAccount();
    if (auth instanceof NextResponse) return auth;
    return NextResponse.json({ success: true, data: await getGroups(auth.ownerId) });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'โหลดห้องเรียนไม่สำเร็จ') },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAccount();
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'ใส่ชื่อห้องเรียน' }, { status: 400 });
    }
    const group = await addGroup(name, auth.ownerId);
    return NextResponse.json({ success: true, data: group });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'สร้างห้องเรียนไม่สำเร็จ') },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAccount();
    if (auth instanceof NextResponse) return auth;

    const id = new URL(request.url).searchParams.get('id') || '';
    if (!id) {
      return NextResponse.json({ success: false, error: 'ไม่พบห้องเรียน' }, { status: 400 });
    }
    const ok = await deleteGroup(id, auth.ownerId);
    if (!ok) return notFound();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'ลบห้องเรียนไม่สำเร็จ') },
      { status: 500 }
    );
  }
}
