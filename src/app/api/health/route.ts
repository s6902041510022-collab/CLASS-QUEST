import { NextResponse } from 'next/server';
import { getDb, usingKv, storeLabel } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ใช้ตรวจว่าเชื่อมต่อฐานข้อมูลได้ และตอนนี้เก็บข้อมูลไว้ที่ไหน
export async function GET() {
  try {
    const db = await getDb();
    return NextResponse.json({
      ok: true,
      store: storeLabel,
      usingKv,
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
