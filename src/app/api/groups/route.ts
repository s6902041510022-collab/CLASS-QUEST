import { NextResponse } from 'next/server';
import { getGroups, addGroup, deleteGroup } from '@/lib/db';

// GET รายการห้องเรียน (โฟลเดอร์) + จำนวนนักเรียนในแต่ละห้อง
export async function GET() {
  try {
    const groups = await getGroups();
    return NextResponse.json({ success: true, data: groups });
  } catch {
    return NextResponse.json({ success: false, error: 'โหลดห้องเรียนไม่สำเร็จ' }, { status: 500 });
  }
}

// POST สร้างห้องเรียนใหม่ — ครูพิมพ์ชื่อเอง
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'ใส่ชื่อห้องเรียน' }, { status: 400 });
    }
    const group = await addGroup(name);
    return NextResponse.json({ success: true, data: group });
  } catch {
    return NextResponse.json({ success: false, error: 'สร้างห้องเรียนไม่สำเร็จ' }, { status: 500 });
  }
}

// DELETE ลบห้องเรียน (นักเรียนในห้องจะกลับไป "ไม่มีห้อง")
export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('id') || '';
    if (!id) {
      return NextResponse.json({ success: false, error: 'ไม่พบห้องเรียน' }, { status: 400 });
    }
    const ok = await deleteGroup(id);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'ไม่พบห้องเรียน' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'ลบห้องเรียนไม่สำเร็จ' }, { status: 500 });
  }
}