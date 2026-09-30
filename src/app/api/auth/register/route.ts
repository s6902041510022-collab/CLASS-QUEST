// POST /api/auth/register — สมัครบัญชีครูใหม่
//
// เปิดให้สมัครได้ทุกคน เพราะข้อมูลถูกแยกตามเจ้าของ (ownerId) อยู่แล้ว
// คนที่สมัครใหม่จะเห็นแค่เกมของตัวเอง ไม่กระทบของคนอื่น

import { NextResponse } from 'next/server';
import { registerAccount, createAuthSession, countAccounts } from '@/lib/db';
import { attachSessionCookie } from '@/lib/auth-server';
import { validateRegistration, normalizeUsername } from '@/lib/accounts';
import { safe, errorMessage } from '../_shared';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const username = normalizeUsername(body.username || '');
    const password = String(body.password || '');
    const name = String(body.name || '').trim();

    // คืนทุกช่องที่ผิดพร้อมกัน ไม่ใช่ทีละช่อง — ครูมือใหม่มักกรอกผิดหลายช่อง
    const errors = validateRegistration({ username, password, name });
    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: errors[0].message,
          field: errors[0].field,
          errors,
        },
        { status: 400 }
      );
    }

    // คนแรกที่สมัคร ระบบจะย้ายข้อมูลเดิม (เกม/นักเรียนที่ทำไว้ตอนใช้ PIN) ให้เขา
    const account = await registerAccount({ username, password, name, avatar: body.avatar });
    const token = await createAuthSession(account.id);

    const res = NextResponse.json({
      success: true,
      data: safe(account),
      isFirstTeacher: (await countAccounts()) === 1,
    });
    return attachSessionCookie(res, token);
  } catch (err) {
    const message = errorMessage(err, 'สมัครบัญชีไม่สำเร็จ');
    // 409 = ชื่อผู้ใช้ซ้ำ (ไม่ใช่เซิร์ฟเวอร์พัง) ลูกค้าต้องแก้เอง
    const status = message.includes('ถูกใช้ไปแล้ว') ? 409 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
