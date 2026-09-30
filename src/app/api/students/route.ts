// รายชื่อนักเรียน — เฉพาะของครูที่ล็อกอิน
//
// addStudent ต้องรับ ownerId เป็นพารามิเตอร์ที่สอง (ตอนนี้เป็น avatar)
// เพราะชื่อนักเรียนเดียวกันของคนละครูต้องไม่ชนกัน

import { NextResponse } from 'next/server';
import { getStudents, addStudent } from '@/lib/db';
import { requireAccount } from '@/lib/auth-server';
import { errorMessage } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await requireAccount();
    if (auth instanceof NextResponse) return auth;
    return NextResponse.json({ success: true, data: await getStudents(auth.ownerId) });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'โหลดรายชื่อไม่สำเร็จ') },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAccount();
    if (auth instanceof NextResponse) return auth;

    const { name, avatar, names } = await request.json();

    // เพิ่มทีละคน หรือเพิ่มเป็นชุด (วางรายชื่อทั้งห้อง)
    if (Array.isArray(names)) {
      const added = [];
      for (const n of names.map((s: any) => String(s).trim()).filter(Boolean)) {
        added.push(await addStudent(n, auth.ownerId));
      }
      return NextResponse.json({ success: true, data: added, count: added.length });
    }

    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, error: 'กรอกชื่อนักเรียน' }, { status: 400 });
    }
    const student = await addStudent(String(name), auth.ownerId, avatar);
    return NextResponse.json({ success: true, data: student }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'เพิ่มรายชื่อไม่สำเร็จ') },
      { status: 500 }
    );
  }
}
