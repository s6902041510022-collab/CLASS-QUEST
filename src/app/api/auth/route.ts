import { NextResponse } from 'next/server';
import { verifyPin, getTeacher, saveTeacher, getSettings } from '@/lib/db';

// POST เข้าสู่ระบบครู — ตรวจ PIN แล้วตั้ง/อัปเดตชื่อครู
export async function POST(request: Request) {
  try {
    const { pin, name, avatar } = await request.json();

    if (!pin) {
      return NextResponse.json({ success: false, error: 'กรอก PIN ก่อนครับ' }, { status: 400 });
    }

    const isValid = await verifyPin(String(pin));
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'รหัส PIN ไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const existing = await getTeacher();
    const teacherName = (name || existing.name || '').trim();

    // ยังไม่มีชื่อ → บอก client ให้ไปหน้าตั้งชื่อ
    if (!teacherName) {
      return NextResponse.json({ success: true, needsName: true, data: existing });
    }

    const teacher = await saveTeacher({ name: teacherName, avatar: avatar || existing.avatar });
    return NextResponse.json({ success: true, data: teacher });
  } catch {
    return NextResponse.json({ success: false, error: 'เข้าสู่ระบบไม่สำเร็จ' }, { status: 500 });
  }
}

// GET ข้อมูลครูปัจจุบัน
export async function GET() {
  try {
    const teacher = await getTeacher();
    const settings = await getSettings();
    return NextResponse.json({
      success: true,
      data: { ...teacher, hasPin: Boolean(settings.teacherPin) },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'โหลดข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}

// PUT อัปเดตชื่อ/avatar ครู
export async function PUT(request: Request) {
  try {
    const { name, avatar } = await request.json();
    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, error: 'กรอกชื่อครูด้วยครับ' }, { status: 400 });
    }
    const teacher = await saveTeacher({ name, avatar });
    return NextResponse.json({ success: true, data: teacher });
  } catch {
    return NextResponse.json({ success: false, error: 'บันทึกไม่สำเร็จ' }, { status: 500 });
  }
}

// PATCH เปลี่ยน PIN
export async function PATCH(request: Request) {
  try {
    const { currentPin, newPin } = await request.json();
    if (!newPin || String(newPin).length < 4) {
      return NextResponse.json(
        { success: false, error: 'PIN ใหม่ต้องมีอย่างน้อย 4 หลัก' },
        { status: 400 }
      );
    }
    const ok = await verifyPin(String(currentPin || ''));
    if (!ok) {
      return NextResponse.json({ success: false, error: 'PIN ปัจจุบันไม่ถูกต้อง' }, { status: 401 });
    }
    const { updateSettings } = await import('@/lib/db');
    const settings = await updateSettings({ teacherPin: String(newPin) });
    return NextResponse.json({ success: true, data: { ok: true, pin: settings.teacherPin } });
  } catch {
    return NextResponse.json({ success: false, error: 'เปลี่ยน PIN ไม่สำเร็จ' }, { status: 500 });
  }
}
