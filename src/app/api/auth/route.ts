// ==================== ข้อมูลบัญชี / โปรไฟล์ / ออกจากระบบ ====================
//
// ⚠️ เปลี่ยนจากเดิม: เดิมใช้ PIN 4 หลักที่ตั้งไว้ทั้งระบบ (คนเดียวทั้งชั้น)
//    ตอนนี้ทุกครูมี username + password ของตัวเอง และข้อมูลถูกแยกตามเจ้าของ
//    เข้าสู่ระบบ → POST /api/auth/login | สมัคร → POST /api/auth/register
//
// ไม่มีการ "รีเซ็ตรหัสผ่าน" แบบไม่ต้องมีรหัสเดิม เพราะถ้ามีทางนั้น
// ใครก็ยิง endpoint รีเซ็ตแล้วเข้าทั้งระบบได้ — ลืมก็ต้องสมัครใหม่

import { NextResponse } from 'next/server';
import {
  updateAccountProfile,
  countAccounts,
  deleteAuthSession,
} from '@/lib/db';
import {
  clearSessionCookie,
  requireAccount,
  readSessionToken,
  getCurrentAccount,
} from '@/lib/auth-server';
import { safe, errorMessage } from './_shared';

export const dynamic = 'force-dynamic';

// ---------------- GET ข้อมูลบัญชีปัจจุบัน ----------------

export async function GET() {
  try {
    const account = await getCurrentAccount();
    // ไม่ล็อกอินก็ไม่ error — เพราะหน้าเว็บต้องถามทุกครั้งว่า "เข้าสู่ระบบแล้วหรือยัง"
    return NextResponse.json({
      success: true,
      data: safe(account),
      needsName: Boolean(account && !String(account.name || '').trim()),
      hasAccounts: (await countAccounts()) > 0,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'โหลดข้อมูลไม่สำเร็จ') },
      { status: 500 }
    );
  }
}

// ---------------- PUT แก้ชื่อ/รูปครู ----------------

export async function PUT(request: Request) {
  try {
    const auth = await requireAccount();
    if (auth instanceof NextResponse) return auth;

    const { name, avatar } = await request.json().catch(() => ({}));
    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, error: 'กรอกชื่อครูด้วยครับ' }, { status: 400 });
    }
    const account = await updateAccountProfile(auth.ownerId, { name, avatar });
    return NextResponse.json({ success: true, data: safe(account) });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'บันไม่สำเร็จ') },
      { status: 500 }
    );
  }
}

// ---------------- DELETE ออกจากระบบ ----------------
// ลบเซสชันฝั่งเซิร์ฟเวอร์ด้วย ไม่ใช่แค่ล้างคุกกี้ — ไม่งั้นโทเคนยังใช้ได้อยู่

export async function DELETE() {
  try {
    await deleteAuthSession(readSessionToken());
    const res = NextResponse.json({ success: true });
    return clearSessionCookie(res);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'ออกจากระบบไม่สำเร็จ') },
      { status: 500 }
    );
  }
}
