// นักเรียนคนเดียว — เฉพาะเจ้าของ
//
// getStudent/updateStudent ใน db.ts บังคับ ownerId แล้ว
// ถ้า id ไม่ใช่ของครู จะได้ null → ตอบ 404 (ไม่ใช่ 403 เพื่อไม่ยืนยันว่ามีนักเรียนคนนั้นอยู่)

import { NextResponse } from 'next/server';
import { getStudent, updateStudent, deleteStudent, getStudentHistory, getGroups } from '@/lib/db';
import { requireAccount, notFound } from '@/lib/auth-server';
import { errorMessage } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAccount();
    if (auth instanceof NextResponse) return auth;

    const student = await getStudent(params.id, auth.ownerId);
    if (!student) return notFound();
    const history = await getStudentHistory(params.id, auth.ownerId);
    return NextResponse.json({ success: true, data: student, history });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'โหลดข้อมูลไม่สำเร็จ') },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAccount();
    if (auth instanceof NextResponse) return auth;

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
    // ต้องเช็คว่าห้องนั้นเป็นของครูคนนี้ด้วย — ไม่งั้นย้ายนักเรียนเข้าโฟลเดอร์ของครูอื่นได้
    if (body.groupId !== undefined) {
      const groupId = body.groupId ? String(body.groupId) : '';
      if (groupId) {
        const groups = await getGroups(auth.ownerId);
        if (!groups.some((g: any) => g.id === groupId)) {
          return NextResponse.json({ success: false, error: 'ไม่พบห้องเรียนนี้' }, { status: 400 });
        }
      }
      updates.groupId = groupId;
    }

    const student = await updateStudent(params.id, updates, auth.ownerId);
    if (!student) return notFound();
    return NextResponse.json({ success: true, data: student });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'บันไม่สำเร็จ') },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAccount();
    if (auth instanceof NextResponse) return auth;

    const ok = await deleteStudent(params.id, auth.ownerId);
    if (!ok) return notFound();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'ลบไม่สำเร็จ') },
      { status: 500 }
    );
  }
}
