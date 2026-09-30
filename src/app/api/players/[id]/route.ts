// ผู้เล่นรายเดียว — นักเรียนดูตัวเอง / ครูดูผู้เล่นในเกมของตัวเอง
//
// PUT และ DELETE เป็นของครูเท่านั้น (แก้คะแนน / ลบรอบการเล่น)
// เดิมเปิดสาธารณะ — ใครก็แก้ xp ของผู้เล่นคนอื่นได้

import { NextResponse } from 'next/server';
import { getPlayer, updatePlayer, getDb, getGame } from '@/lib/db';
import { currentPlayer, requireAccount, notFound } from '@/lib/auth-server';
import { errorMessage } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const me = await currentPlayer();
    if (me && me.id === params.id) {
      return NextResponse.json({ success: true, data: me });
    }

    const auth = await requireAccount();
    if (auth instanceof NextResponse) return auth;
    const player = await getPlayer(params.id);
    if (!player) return notFound();
    if ((await getGame(player.gameId))?.ownerId !== auth.ownerId) return notFound();
    return NextResponse.json({ success: true, data: player });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'Failed to fetch player') },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAccount();
    if (auth instanceof NextResponse) return auth;

    const player = await getPlayer(params.id);
    if (!player) return notFound();
    if ((await getGame(player.gameId))?.ownerId !== auth.ownerId) return notFound();

    const data = await request.json();
    // gameId เปลี่ยนเองไม่ได้ — ถ้าย้ายไปเกมคนอื่น ใช้ยิงแก้ข้ามบัญชีได้
    const { gameId: _ignored, sessionId: _ignored2, ...safe } = data || {};
    const updated = await updatePlayer(params.id, safe);
    if (!updated) return notFound();
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'Failed to update player') },
      { status: 500 }
    );
  }
}

// DELETE ลบรอบการเล่นหนึ่งรอบของนักเรียน (กรณีเด็กเข้าร่วมผิดพลาด / ตอบผิดเกม)
// → หักสถิติถาวรที่ rollUp ไว้ให้แล้ว (XP, gamesPlayed, correct/total) + XP ของทีม (ถ้าเล่นโหมดทีม)
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAccount();
    if (auth instanceof NextResponse) return auth;

    const db = await getDb();
    const i = db.data.players.findIndex((p: any) => p.id === params.id);
    if (i === -1) return notFound();
    const player = db.data.players[i];

    // ต้องเป็นผู้เล่นในเกมของครูคนนี้ ไม่งั้นลบรอบเล่นของครูอื่นได้
    if ((await getGame(player.gameId))?.ownerId !== auth.ownerId) return notFound();

    // เจ้าของสถิติ (นักเรียน) — หักเฉพาะที่ rollUp เข้าสถิติถาวรแล้วจริงๆ
    if (player.studentId) {
      const si = db.data.students.findIndex(
        (s: any) => s.id === player.studentId && s.ownerId === auth.ownerId
      );
      if (si !== -1) {
        const s = db.data.students[si];
        const wasRolled = (s.completedSessions || []).includes(player.sessionId);
        db.data.students[si] = {
          ...s,
          totalXp: wasRolled
            ? Math.max(0, (s.totalXp || 0) - (player.xp || 0))
            : s.totalXp,
          gamesPlayed: wasRolled ? Math.max(0, (s.gamesPlayed || 0) - 1) : s.gamesPlayed,
          correctAnswers: wasRolled
            ? Math.max(0, (s.correctAnswers || 0) - (player.correctAnswers || 0))
            : s.correctAnswers,
          totalAnswers: wasRolled
            ? Math.max(0, (s.totalAnswers || 0) - (player.totalAnswers || 0))
            : s.totalAnswers,
          completedSessions: (s.completedSessions || []).filter(
            (sid: string) => sid !== player.sessionId
          ),
        };
      }
    }

    // ทีม (ถ้าเล่นโหมดทีม) — XP ทีมเพิ่มแบบ real-time ตอนตอบถูก → หักคืน
    if (player.teamId) {
      const ti = db.data.teams.findIndex((t: any) => t.id === player.teamId);
      if (ti !== -1) {
        db.data.teams[ti].totalXp = Math.max(
          0,
          (db.data.teams[ti].totalXp || 0) - (player.xp || 0)
        );
      }
    }

    db.data.players.splice(i, 1);
    await db.write();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'ลบไม่สำเร็จ') },
      { status: 500 }
    );
  }
}