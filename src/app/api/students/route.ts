import { NextResponse } from 'next/server';
import { getStudents, getStudent, addStudent } from '@/lib/db';
import { errorMessage } from '@/lib/api-error';

export async function GET() {
  try {
    return NextResponse.json({ success: true, data: await getStudents() });
  } catch (err) {
    return NextResponse.json({ success: false, error: errorMessage(err, 'โหลดรายชื่อไม่สำเร็จ') }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, avatar, names } = await request.json();

    // เพิ่มทีละคน หรือเพิ่มเป็นชุด (วางรายชื่อทั้งห้อง)
    if (Array.isArray(names)) {
      const added = [];
      for (const n of names.map((s: any) => String(s).trim()).filter(Boolean)) {
        added.push(await addStudent(n));
      }
      return NextResponse.json({ success: true, data: added, count: added.length });
    }

    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, error: 'กรอกชื่อนักเรียน' }, { status: 400 });
    }
    const student = await addStudent(String(name), avatar);
    return NextResponse.json({ success: true, data: student }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: errorMessage(err, 'เพิ่มรายชื่อไม่สำเร็จ') }, { status: 500 });
  }
}
