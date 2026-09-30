import { NextResponse } from 'next/server';
import { getDb, usingKv, storeLabel, storeWritable } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ใช้ตรวจว่าเชื่อมต่อฐานข้อมูลได้ และตอนนี้เก็บข้อมูลไว้ที่ไหน
export async function GET() {
  try {
    const db = await getDb();
    const perm = await storeWritable();
    return NextResponse.json({
      ok: true,
      store: storeLabel,
      usingKv,
      writable: perm.writable,
      // ถ้าเขียนไม่ได้ ให้บอกด้วยว่าต้องทำอะไรต่อ ไม่ใช่แค่รหัส error
      hint: perm.writable
        ? undefined
        : `ที่เก็บข้อมูลเขียนไม่ได้ (${perm.reason}) — ถ้า deploy บน Vercel ต้องตั้ง ` +
          `KV_REST_API_URL และ KV_REST_API_TOKEN (Vercel KV / Upstash Redis)`,
      counts: {
        games: db.data.games.length,
        missions: db.data.missions.length,
        students: db.data.students.length,
        players: db.data.players.length,
        sessions: db.data.sessions.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
