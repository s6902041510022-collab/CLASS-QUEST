// POST /api/auth/login — เข้าสู่ระบบด้วยชื่อผู้ใช้ + รหัสผ่าน

import { NextResponse } from 'next/server';
import { authenticate, createAuthSession } from '@/lib/db';
import { attachSessionCookie } from '@/lib/auth-server';
import { normalizeUsername } from '@/lib/accounts';
import { safe, errorMessage } from '../_shared';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json().catch(() => ({}));
    const key = normalizeUsername(username || '');
    if (!key || !password) {
      return NextResponse.json(
        { success: false, error: 'กรอกชื่อผู้ใช้และรหัสผ่าน' },
        { status: 400 }
      );
    }

    const account = await authenticate(key, String(password));
    if (!account) {
      // ข้อความเดียวกันทั้งสองกรณี ทั้งชื่อไม่มีและรหัสผิด
      // ถ้าแยกบอก จะเดาชื่อผู้ใช้ที่มีอยู่ในระบบได้ทีละชื่อ
      return NextResponse.json(
        { success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const token = await createAuthSession(account.id);
    const res = NextResponse.json({ success: true, data: safe(account) });
    return attachSessionCookie(res, token);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'เข้าสู่ระบบไม่สำเร็จ') },
      { status: 500 }
    );
  }
}
