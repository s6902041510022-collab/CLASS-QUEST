import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import {
  getGame,
  getPlayer,
  getSession,
  getDb,
  rollUp,
  currentSessionIndex,
  sessionBossHpLeft,
  settleBossDefeat,
  advancePlayerPosition,
} from '@/lib/db';
import { BOSS_DAMAGE_PER_CORRECT, BONUS_MAX_XP } from '@/lib/utils';
import { questionToTask, gradeTask } from '@/lib/mission-tasks';

// POST บันทึกคำตอบ 1 ข้อ (เขียนข้อมูลทั้งหมดในรอบเดียว เพื่อกันเขียนซ้อนแล้วข้อมูลหาย)
export async function POST(request: Request) {
  try {
    const { playerId, gameId, missionId, questionId, selectedAnswer, timeTakenSec } = await request.json();
    if (!playerId || !gameId || !missionId || questionId == null || selectedAnswer == null) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบ' }, { status: 400 });
    }

    const playerCheck = await getPlayer(playerId);
    if (!playerCheck) {
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
    // แปลงเป็น "งาน" หนึ่งครั้ง ใช้ทั้งตอบซ้ำและตรวจคำตอบ
    // (รองรับทุกชนิด: ตัวเลือก / กรอกตัวเลข / จับคู่ — ตัวเลือกยังคงผลเดิมทุกประการ)
    const task = questionToTask(question, 0);

    // ผู้เล่นรายล่าสุดใน db นี้ (เผื่อมีรอบอื่นเรียกพร้อมกัน)
    const player = db.data.players.find((p: any) => p.id === playerId);
    if (!player) {
      return NextResponse.json({ success: false, error: 'ไม่พบผู้เล่น' }, { status: 404 });
    }

    // ตอบซ้ำข้อเดียวกันไม่นับซ้ำ — คืนผลเดิมที่เคยตอบไว้ (เผื่อโหลดหน้าซ้ำกลางระหว่างดูเฉลย)
    const prev = (player.answers || []).find((a: any) => a.questionId === questionId);
    if (prev) {
      return NextResponse.json({
        success: true,
        data: {
          alreadyAnswered: true,
          correct: Boolean(prev.correct),
          correctAnswer: prev.correctAnswer ?? task.correctAnswer,
          explanation: task.explanation,
          xpGained: 0,
          totalXp: player.xp,
          posMission: Number(player.posMission) || 0,
          posQuestion: Number(player.posQuestion) || 0,
          quizDone: Boolean(player.quizDone),
          bossPos: Number(player.bossPos) || 0,
          bossDone: Boolean(player.bossDone),
        },
      });
    }

    const isBossQuestion = mission?.type === 'boss';
    const { correct } = gradeTask(task, selectedAnswer);
    const xpGained = correct ? mission.xp || 100 : 0;

    // === โบนัส "ตอบเร็ว" — เฉพาะคำตอบที่ถูกเท่านั้น ===
    // เทียบเวลาที่ใช้อัปเดตกับงบเวลารายข้อ (session.timeLimit): เหลือเท่าไหร่ ได้สัดส่วนเท่านั้น
    let speedBonus = 0;
    if (correct) {
      const siT = currentSessionIndex(db.data.sessions, gameId);
      const sT = siT >= 0 ? db.data.sessions[siT] : undefined;
      const budget = Number(sT?.timeLimit) || 0;
      if (budget > 0) {
        const used = Math.max(0, Math.min(budget, Number(timeTakenSec) || 0));
        speedBonus = Math.round(BONUS_MAX_XP * ((budget - used) / budget));
      }
    }

    // บันทึกคำตอบ (เขียนใน array เดียวกันกับ player — merge ปลอดภัยตาม id)
    player.xp = (player.xp || 0) + xpGained + speedBonus;
    player.correctAnswers = (player.correctAnswers || 0) + (correct ? 1 : 0);
    player.totalAnswers = (player.totalAnswers || 0) + 1;
    player.answers = [
      ...(player.answers || []),
      {
        id: randomUUID(),
        missionId,
        questionId,
        // kind/prompt เก็บไว้เผื่อภายหลังแก้คำถามแล้วอยากรู้ว่าเดิมเป็นชนิดไหน
        // (คำถามเก่าไม่มี kind → undefined = ตัวเลือก)
        kind: task.kind,
        questionText: task.prompt,
        selectedAnswer: task.kind === 'choice' ? Number(selectedAnswer) : selectedAnswer,
        correctAnswer: task.kind === 'choice' ? Number(task.correctAnswer) : task.correctAnswer,
        correct,
        xp: xpGained,
        bonus: speedBonus,
        at: new Date().toISOString(),
      },
    ];

    // ทีม (ถ้าเล่นโหมดทีม)
    if (player.teamId && correct) {
      const team = db.data.teams.find((t: any) => t.id === player.teamId);
      if (team) team.totalXp = (team.totalXp || 0) + xpGained;
    }

    // === ด่านบอส: ตอบถูก = บอสเสีย HP ===
    // เก็บเป็น "ประวัติโจมตี" (array มี id) แทนการบวกลบตัวเลข
    // เพราะตอน 40 คนตอบพร้อมกัน การเขียนตัวเลขพร้อมกันจะชนกัน (merge ทิ้งบางค่า)
    // แต่การต่อ array ด้วย id ไม่มีทางหาย มีแต่เพิ่ม — HP ถึงคำนวณจากจำนวนครั้งที่ยิงได้
    let bossHit = false;
    if (isBossQuestion && correct) {
      const si = currentSessionIndex(db.data.sessions, gameId);
      if (si !== -1) {
        const session = db.data.sessions[si];
        if (session?.status === 'boss') {
          bossHit = true;
          const hits = session.bossHits || (session.bossHits = []);
          hits.push({
            id: randomUUID(),
            questionId,
            playerId,
            at: new Date().toISOString(),
          });
        }
      }
    }

    // === โหมดนักเรียนไปเอง: ตอบถูกแล้วเลื่อนข้อถัดไปทันที (ไม่ต้องรอครูกดถัดไป) ===
    // รวมเขียนไว้รอบเดียวกับคำตอบ — กันข้อมูลไม่ตรงกันถ้าเขียนแยกจังหวะ
    if (correct) advancePlayerPosition(db, player);

    await db.write();

    // ตรวจผล "รวม" หลัง merge: แต่ละคนเห็นข้อมูลเพียงส่วนเดียวตอนตอบพร้อมกัน
    // ต้องอ่านจากข้อมูลที่ merge เสร็จแล้วก่อนสรุปว่าบอสตาย (กันพลาดจบเกมทุกคน)
    let bossHpLeft: number | undefined;
    if (isBossQuestion) {
      const si2 = currentSessionIndex(db.data.sessions, gameId);
      const merged = si2 >= 0 ? db.data.sessions[si2] : undefined;
      if (merged?.status === 'boss') {
        bossHpLeft = sessionBossHpLeft(merged);
        // ถ้าแตะ 0 พอดีกลาง batch -> ตีตรา bossDefeatedAt แล้วปิดรอบเมื่อเลยช่วงลมจับ
        // (กัน rollUp เก็บคำตอบไม่ครบเพราะคนที่เหลือยังตอบไม่ทัน)
        await settleBossDefeat(gameId);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        correct,
        kind: task.kind,
        correctAnswer: task.correctAnswer,
        explanation: task.explanation,
        xpGained,
        speedBonus,
        totalXp: player.xp ?? 0,
        correctAnswers: player.correctAnswers ?? 0,
        totalAnswers: player.totalAnswers ?? 0,
        boss: isBossQuestion,
        bossHit,
        bossHpLeft,
        // ตำแหน่งล่าสุด (ตอบถูกแล้วเลื่อน)
        posMission: Number(player.posMission) || 0,
        posQuestion: Number(player.posQuestion) || 0,
        quizDone: Boolean(player.quizDone),
        bossPos: Number(player.bossPos) || 0,
        bossDone: Boolean(player.bossDone),
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