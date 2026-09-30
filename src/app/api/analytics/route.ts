import { NextResponse } from 'next/server';
import { getMissions, getAllPlayers, getStudents, getSessions, getAllGames } from '@/lib/db';
import { questionToTask, answerLabel, correctLabel } from '@/lib/mission-tasks';
import { requireAccount, requireOwnedGame } from '@/lib/auth-server';
import { errorMessage } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

// สรุปผลการเล่น — เฉพาะเจ้าของเกม
// เดิมเปิดสาธารณะ ใครยิง gameId ของคนอื่นก็เห็นคะแนนนักเรียนทั้งห้องได้
export async function GET(request: Request) {
  try {
    const gameId = new URL(request.url).searchParams.get('gameId');

    if (!gameId) {
      const auth = await requireAccount();
      if (auth instanceof NextResponse) return auth;
      return NextResponse.json({ success: true, data: await overview(auth.ownerId) });
    }

    const auth = await requireOwnedGame(gameId);
    if (auth instanceof NextResponse) return auth;

    const [missions, players, sessions, roster] = await Promise.all([
      getMissions(gameId, auth.ownerId),
      getAllPlayers(gameId),
      getSessions(gameId),
      getStudents(auth.ownerId),
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
        const task = questionToTask(q, 0);
        // ตัวเลือก: นับทีละ index | ชนิดอื่น: นับทีละคำตอบที่ส่งมา (ข้อความสั้น ๆ อ่านง่ายกว่า)
        const tally = new Map<string, number>();
        const optionTally: any[] = [];
        if (task.kind === 'choice') {
          task.options.forEach((_, i) => {
            optionTally.push({ index: i, count: answers.filter((a: any) => a.selectedAnswer === i).length });
          });
        } else {
          for (const a of answers) {
            const label = answerLabel(task, a.selectedAnswer);
            tally.set(label, (tally.get(label) || 0) + 1);
          }
        }
        const answerTally = [...tally.entries()]
          .map(([label, count]) => ({ label, count }))
          .sort((x, y) => y.count - x.count)
          .slice(0, 8);
        return {
          questionId: q.id,
          missionId: m.id,
          missionTitle: m.title,
          text: q.text,
          kind: task.kind,
          options: task.options,
          correctAnswer: task.correctAnswer,
          unit: task.unit,
          correctLabel: correctLabel(task),
          answered: answers.length,
          correct: correctCount,
          accuracy: answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0,
          optionTally,
          answerTally,
        };
      })
    );

    const totalXp = players.reduce((a: number, p: any) => a + (p.xp || 0), 0);
    const totalAnswers = players.reduce((a: number, p: any) => a + (p.totalAnswers || 0), 0);
    const totalCorrect = players.reduce((a: number, p: any) => a + (p.correctAnswers || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        game: auth.game,
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
  } catch (err) {
    return NextResponse.json({ success: false, error: errorMessage(err, 'วิเคราะห์ข้อมูลไม่สำเร็จ') }, { status: 500 });
  }
}

// สรุปรวมทุกเกม — เฉพาะของครูคนนี้
// เดิมอ่าน db.data.games / db.data.students ตรง ๆ ซึ่งคือทุกคนในระบบ
async function overview(ownerId: string) {
  // getAllPlayers ไม่มี ownerId แต่ผูกกับเกมเสมอ จึงกรองผ่านรายชื่อเกมของครูคนนี้
  const games = await getAllGames(ownerId);
  const students = await getStudents(ownerId);
  const gameIds = new Set(games.map((g: any) => g.id));
  const allPlayers = (await Promise.all(games.map((g: any) => getAllPlayers(g.id))))
    .flat()
    .filter((p: any) => gameIds.has(p.gameId));
  const players = allPlayers;

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
