import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import {
  getGame,
  getPlayer,
  updatePlayer,
  getSession,
  getDb,
  rollUp,
} from '@/lib/db';

// POST บันทึกคำตอบ 1 ข้อ
export async function POST(request: Request) {
  try {
    const { playerId, gameId, missionId, questionId, selectedAnswer } = await request.json();
    if (!playerId || !gameId || !missionId || questionId == null || selectedAnswer == null) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบ' }, { status: 400 });
    }

    const player = await getPlayer(playerId);
    if (!player) {
      return NextResponse.json({ success: false, error: 'ไม่พบผู้เล่น' }, { status: 404 });
    }
    if (!(await getGame(gameId))) {
      return NextResponse.json({ success: false, error: 'ไม่พบเกม' }, { status: 404 });
    }

    const db = await getDb();
    const mission = db.data.missions.find((m: any) => m.id === missionId);
    if (!mission) {
      return NextResponse.json({ success: false, error: 'ไม่พบ Mission' }, { status: 404 });
    }
    const question = (mission.questions || []).find((q: any) => q.id === questionId);
    if (!question) {
      return NextResponse.json({ success: false, error: 'ไม่พบคำถาม' }, { status: 404 });
    }

    // ตอบซ้ำข้อเดียวกันไม่นับซ้ำ
    if ((player.answers || []).some((a: any) => a.questionId === questionId)) {
      return NextResponse.json({
        success: true,
        data: { alreadyAnswered: true, correct: false, xpGained: 0, totalXp: player.xp },
      });
    }

    const correct = Number(selectedAnswer) === Number(question.correctAnswer);
    const xpGained = correct ? mission.xp || 100 : 0;

    const updated = await updatePlayer(playerId, {
      xp: (player.xp || 0) + xpGained,
      correctAnswers: (player.correctAnswers || 0) + (correct ? 1 : 0),
      totalAnswers: (player.totalAnswers || 0) + 1,
      answers: [
        ...(player.answers || []),
        {
          id: randomUUID(),
          missionId,
          questionId,
          questionText: question.text,
          selectedAnswer: Number(selectedAnswer),
          correctAnswer: Number(question.correctAnswer),
          correct,
          xp: xpGained,
          at: new Date().toISOString(),
        },
      ],
    });

    // ทีม (ถ้าเล่นโหมดทีม)
    if (player.teamId && correct) {
      const team = db.data.teams.find((t: any) => t.id === player.teamId);
      if (team) {
        team.totalXp = (team.totalXp || 0) + xpGained;
        await db.write();
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        correct,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation || '',
        xpGained,
        totalXp: updated?.xp ?? 0,
        correctAnswers: updated?.correctAnswers ?? 0,
        totalAnswers: updated?.totalAnswers ?? 0,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'บันทึกคำตอบไม่สำเร็จ' }, { status: 500 });
  }
}

// POST /api/answers?action=finish → ปิดรอบแล้วนำคะแนนเข้าสถิติถาวรของนักเรียน
export async function PUT(request: Request) {
  try {
    const { gameId, playerId } = await request.json();
    if (!gameId || !playerId) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบ' }, { status: 400 });
    }
    const player = await getPlayer(playerId);
    const session = await getSession(gameId);
    if (!player || !session) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูล' }, { status: 404 });
    }
    await rollUp(player.studentId, session.id, player);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'บันทึกผลไม่สำเร็จ' }, { status: 500 });
  }
}
