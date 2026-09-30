// POST /api/auth/password — เปลี่ยนรหัสผ่าน
//
// บังคับยืนยันรหัสเดิมก่อน ไม่งั้นคนที่เปิดหน้าเว็บค้างไว้บนเครื่องครู
// จะเปลี่ยนรหัสได้ทันทีโดยครูไม่รู้ตัว
//
// เปลี่ยนเสร็จจะออกจากระบบทุกเครื่องทันที เพราะถ้ายังคงเซสชันเดิมไว้
// คนที่ขโมยรหัสเก่าไปก็ยังใช้เว็บต่อได้อีก 30 วัน

import { NextResponse } from 'next/server';
import { updateAccountPassword, deleteAuthSession } from '@/lib/db';
import { clearSessionCookie, requireAccount, readSessionToken } from '@/lib/auth-server';
import { MIN_PASSWORD } from '@/lib/accounts';
import { errorMessage } from '../_shared';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const auth = await requireAccount();
    if (auth instanceof NextResponse) return auth;

    const { currentPassword, newPassword } = await request.json().catch(() => ({}));
    const next = String(newPassword || '');
    if (next.length < MIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: `รหัสผ่านใหม่ต้องยาวอย่างน้อย ${MIN_PASSWORD} ตัว` },
        { status: 400 }
      );
    }

    const result = await updateAccountPassword(
      auth.ownerId,
      String(currentPassword || ''),
      next
    );
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ' },
        { status: 401 }
      );
    }

    await deleteAuthSession(readSessionToken());
    return clearSessionCookie(NextResponse.json({ success: true, data: { ok: true } }));
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'เปลี่ยนรหัสผ่านไม่สำเร็จ') },
      { status: 500 }
    );
  }
}
