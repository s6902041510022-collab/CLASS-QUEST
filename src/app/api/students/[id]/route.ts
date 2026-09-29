import { NextResponse } from 'next/server';
import { getStudent, updateStudent, deleteStudent, getStudentHistory } from '@/lib/db';

// GET โปรไฟล์ + ประวัติการเล่นของนักเรียนคนนี้
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const student = await getStudent(params.id);
    if (!student) {
      return NextResponse.json({ success: false, error: 'ไม่พบนักเรียน' }, { status: 404 });
    }
    const history = await getStudentHistory(params.id);
    return NextResponse.json({ success: true, data: student, history });
  } catch {
    return NextResponse.json({ success: false, error: 'โหลดข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}

// PATCH แก้ไขชื่อ/รูป
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const updates: any = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) {
        return NextResponse.json({ success: false, error: 'ชื่อห้ามว่าง' }, { status: 400 });
      }
      updates.name = String(body.name).trim();
    }
    if (body.avatar !== undefined) updates.avatar = body.avatar;
    // ย้ายห้องเรียน ('' = ไม่มีห้อง)
    if (body.groupId !== undefined) updates.groupId = body.groupId ? String(body.groupId) : '';

    const student = await updateStudent(params.id, updates);
    if (!student) {
      return NextResponse.json({ success: false, error: 'ไม่พบนักเรียน' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: student });
  } catch {
    return NextResponse.json({ success: false, error: 'บันทึกไม่สำเร็จ' }, { status: 500 });
  }
}

// DELETE ลบออกจากรายชื่อ
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const ok = await deleteStudent(params.id);
    return NextResponse.json({ success: ok });
  } catch {
    return NextResponse.json({ success: false, error: 'ลบไม่สำเร็จ' }, { status: 500 });
  }
}
