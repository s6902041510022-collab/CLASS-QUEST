// นักเรียนคนเดียว — เจ้าของ หรือตัวนักเรียนเองที่กำลังเล่นอยู่
//
// getStudent/updateStudent ใน db.ts บังคับ ownerId แล้ว
// ถ้า id ไม่ใช่ของครู จะได้ null → ตอบ 404 (ไม่ใช่ 403 เพื่อไม่ยืนยันว่ามีนักเรียนคนนั้นอยู่)
//
// ⚠️ GET เปิดให้นักเรียนดูตัวเองได้ด้วย ไม่งั้นหน้าล็อบี้กับหน้า "ผลของฉัน" พัง
//    (สองหน้านี้ไม่มีบัญชีครู ต้องอ่านข้อมูลตัวเองจาก id ที่อยู่ใน URL)
//    เงื่อนไข: ต้องเป็นผู้เล่นที่คุกกี้ cq_student ชี้อยู่เท่านั้น → ไม่ใช่การเปิดทั้งระบบ

import { NextResponse } from 'next/server';
import { getStudent, getGame, updateStudent, deleteStudent, getStudentHistory, getGroups } from '@/lib/db';
import { requireAccount, currentPlayer, notFound, publicStudent } from '@/lib/auth-server';
import { errorMessage } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAccount();
    // ⚠️ ต้องเช็ค "เป็นเจ้าของจริงไหม" ไม่ใช่แค่ "เป็นครูไหม"
    //    ถ้าคุกกี้ครูคนอื่น (หรือครูคนเดิมที่ล็อกอินค้างบนเครื่องนักเรียน) ยังติดอยู่
    //    requireAccount จะผ่าน → getStudent ได้ null → ถ้าตอบ 404 ตรงนี้เลย
    //    หน้าล็อบี้กับหน้า "ผลของฉัน" จะมองไม่เห็นชื่อตัวเองเลย
    //    แก้โดย: ครูที่ไม่ได้เป็นเจ้าของ → ปล่อยตกไปทางนักเรียนต่อ
    if (!(auth instanceof NextResponse)) {
      const owned = await getStudent(params.id, auth.ownerId);
      if (owned) {
        const ownedHistory = await getStudentHistory(params.id, auth.ownerId);
        return NextResponse.json({ success: true, data: owned, history: ownedHistory });
      }
    }
    // ไม่ได้เป็นเจ้าของนักเรียนคนนี้ → ลองดูว่าเป็นนักเรียนที่กำลังเล่นตัวนี้อยู่ไหม
    const player = await currentPlayer();
    if (!player || player.studentId !== params.id) return notFound();

    // getStudent บังคับ ownerId → ต้องหาเจ้าของเกมที่ตัวนี้กำลังเล่นอยู่ก่อน
    const game = await getGame(player.gameId);
    const me = game ? await getStudent(params.id, game.ownerId || '') : null;
    if (!me) return notFound();
    // ตัด ownerId ออก — นักเรียนไม่จำเป็นต้องรู้ว่าเกมเป็นของครูคนไหน
    return NextResponse.json({ success: true, data: publicStudent(me) });
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
