import { NextResponse } from 'next/server';
import { getPlayer, updatePlayer, getDb } from '@/lib/db';
import { errorMessage } from '@/lib/api-error';

// GET single player
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const player = await getPlayer(params.id);
    if (!player) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: player });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: errorMessage(err, 'Failed to fetch player') },
      { status: 500 }
    );
  }
}

// PUT update player
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const player = await updatePlayer(params.id, data);
    if (!player) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: player });
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
    const db = await getDb();
    const i = db.data.players.findIndex((p: any) => p.id === params.id);
    if (i === -1) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบรอบการเล่นนี้' },
        { status: 404 }
      );
    }
    const player = db.data.players[i];

    // เจ้าของสถิติ (นักเรียน) — หักเฉพาะที่ rollUp เข้าสถิติถาวรแล้วจริงๆ
    if (player.studentId) {
      const si = db.data.students.findIndex((s: any) => s.id === player.studentId);
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