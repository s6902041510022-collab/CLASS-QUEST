import { NextResponse } from 'next/server';
import { getDb, getGame, getMissions, getAllPlayers, getStudents, getSessions } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/analytics?gameId=xxx → สรุปผลการเล่นทั้งเกม
// GET /api/analytics            → สรุปรวมทุกเกม
export async function GET(request: Request) {
  try {
    const gameId = new URL(request.url).searchParams.get('gameId');

    if (!gameId) {
      return NextResponse.json({ success: true, data: await overview() });
    }

    const game = await getGame(gameId);
    if (!game) {
      return NextResponse.json({ success: false, error: 'ไม่พบเกม' }, { status: 404 });
    }

    const [missions, players, sessions, roster] = await Promise.all([
      getMissions(gameId),
      getAllPlayers(gameId),
      getSessions(gameId),
      getStudents(),
    ]);

    // --- สรุปต่อนักเรียน ---
    const byStudent = roster
      .map((s: any) => {
        const rounds = players.filter((p: any) => p.studentId === s.id);
        const xp = rounds.reduce((a: number, p: any) => a + (p.xp || 0), 0);
        const correct = rounds.reduce((a: number, p: any) => a + (p.correctAnswers || 0), 0);
        const total = rounds.reduce((a: number, p: any) => a + (p.totalAnswers || 0), 0);
        return {
          id: s.id,
          name: s.name,
          avatar: s.avatar,
          rounds: rounds.length,
          xp,
          correct,
          total,
          accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
        };
      })
      .filter((s: any) => s.rounds > 0)
      .sort((a: any, b: any) => b.xp - a.xp);

    // --- สรุปต่อคำถาม (ครูเห็นว่าข้อไหนคนตอบผิดเยอะ) ---
    const questions = missions.flatMap((m: any) =>
      (m.questions || []).map((q: any) => {
        const answers = players.flatMap((p: any) =>
          (p.answers || []).filter((a: any) => a.questionId === q.id)
        );
        const correctCount = answers.filter((a: any) => a.correct).length;
        const optionTally = (q.options || []).map((_: any, i: number) => ({
          index: i,
          count: answers.filter((a: any) => a.selectedAnswer === i).length,
        }));
        return {
          questionId: q.id,
          missionId: m.id,
          missionTitle: m.title,
          text: q.text,
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          answered: answers.length,
          correct: correctCount,
          accuracy: answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0,
          optionTally,
        };
      })
    );

    const totalXp = players.reduce((a: number, p: any) => a + (p.xp || 0), 0);
    const totalAnswers = players.reduce((a: number, p: any) => a + (p.totalAnswers || 0), 0);
    const totalCorrect = players.reduce((a: number, p: any) => a + (p.correctAnswers || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        game,
        sessions: sessions.length,
        students: byStudent,
        questions,
        totals: {
          players: new Set(players.map((p: any) => p.studentId)).size,
          plays: players.length,
          xp: totalXp,
          correct: totalCorrect,
          answers: totalAnswers,
          accuracy: totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0,
        },
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'วิเคราะห์ข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}

// สรุปรวมทุกเกม
async function overview() {
  const db = await getDb();
  const { games, students, players } = db.data;
  return {
    games: games.map((g: any) => {
      const gp = players.filter((p: any) => p.gameId === g.id);
      const answers = gp.reduce((a: number, p: any) => a + (p.totalAnswers || 0), 0);
      const correct = gp.reduce((a: number, p: any) => a + (p.correctAnswers || 0), 0);
      return {
        id: g.id,
        name: g.name,
        subject: g.subject,
        roomCode: g.roomCode,
        createdAt: g.createdAt,
        students: new Set(gp.map((p: any) => p.studentId)).size,
        plays: gp.length,
        xp: gp.reduce((a: number, p: any) => a + (p.xp || 0), 0),
        answers,
        accuracy: answers > 0 ? Math.round((correct / answers) * 100) : 0,
      };
    }),
    students: students.map((s: any) => ({
      id: s.id,
      name: s.name,
      avatar: s.avatar,
      totalXp: s.totalXp || 0,
      gamesPlayed: s.gamesPlayed || 0,
      accuracy:
        (s.totalAnswers || 0) > 0
          ? Math.round(((s.correctAnswers || 0) / s.totalAnswers) * 100)
          : 0,
    })),
  };
}
