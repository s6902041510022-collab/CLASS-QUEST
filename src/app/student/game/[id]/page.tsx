'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { MASCOT, BOSS_DAMAGE_PER_CORRECT } from '@/lib/utils';

export default function StudentGamePage({ params }: { params: { id: string } }) {
  const gameId = params.id;

  const [playerId, setPlayerId] = useState('');
  const [game, setGame] = useState<any>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [answer, setAnswer] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);

  useEffect(() => {
    setPlayerId(new URLSearchParams(window.location.search).get('playerId') || '');
  }, []);

  useEffect(() => {
    (async () => {
      const [g, m] = await Promise.all([
        fetch(`/api/games/${gameId}`).then((r) => r.json()),
        fetch(`/api/missions?gameId=${gameId}`).then((r) => r.json()),
      ]);
      if (g.success) setGame(g.data);
      if (m.success) setMissions(m.data || []);
      setLoading(false);
    })();
  }, [gameId]);

  // ดึงข้อมูลผู้เล่นตัวเอง (ตำแหน่งข้อที่ตัวเองเล่นอยู่)
  useEffect(() => {
    if (!playerId) return;
    fetch(`/api/players?id=${playerId}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setPlayer(j.data);
      })
      .catch(() => {});
  }, [playerId]);

  // ดูสถานะจากครู (เริ่ม/หยุด/บอส/จบ) — นักเรียนเลื่อนข้อเอง ไม่ต้องพึ่งครูกดข้อถัดไป
  useEffect(() => {
    let cancelled = false;
    let timer: any;
    let lastKey = '';
    let sameCount = 0;

    const tick = async () => {
      try {
        const r = await fetch(`/api/sessions?gameId=${gameId}`).then((x) => x.json());
        if (!cancelled && r.success) {
          setSession(r.data);
          // รวมสถานะนาฬิกาเข้า key ด้วย เพื่อให้รู้เร็ว ๆ ว่าครูกดบวก/ลด/หยุดเวลา
          const key = `${r.data?.status}-${r.data?.currentMissionIndex}-${r.data?.currentQuestionIndex}-${r.data?.timeRunning}-${r.data?.timeDeadline}`;
          sameCount = key === lastKey ? sameCount + 1 : 0;
          lastKey = key;
        }
      } catch {
        /* ไม่ critical */
      }
      if (cancelled) return;
      timer = setTimeout(tick, sameCount >= 2 ? 5000 : 2000);
    };

    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [gameId]);

  // ---------- จับเวลาแบบ "รายข้อต่อคน" ----------
  // แต่ละคนมีเวลาของตัวเองเมื่อไปถึงข้อนั้น (แบบ Quizizz)
  // งบเวลารายข้อมาจาก session.timeLimit (ครูกดตั้ง/+/− ได้ระหว่างเล่น)
  const [now, setNow] = useState(() => Date.now());
  const startRef = useRef<number>(Date.now());
  const budgetRef = useRef<number>(0);
  const prevBudgetRef = useRef<number>(0);
  const timeRunningRef = useRef<boolean>(true);
  // เวลาที่เหลือตอนครูกดหยุด (หยุดนับถอยหลังจริงๆ) — null = กำลังนับอยู่
  const frozenLeftRef = useRef<number | null>(null);
  const firedTimeoutRef = useRef<boolean>(false);
  // เวลาจริงที่ใช้ตอบข้อนี้ (เฉพาะตอนกำลังเล่นจริงๆ ไม่นับตอนครูกดหยุด)
  const elapsedRef = useRef<number>(0);
  const questionActiveRef = useRef<boolean>(false);
  const answerRef = useRef<any>(null);

  const status = session?.status || 'lobby';
  const isBossPhase = status === 'boss';

  // ลำดับเล่น = ด่านควิซก่อน แล้วด่านบอสต่อท้าย (ตรงกับเซิร์ฟเวอร์/หน้าครู)
  const flowMissions = [...missions]
    .sort((a: any, b: any) => a.order - b.order)
    .sort((a: any, b: any) => (a.type === 'boss' ? 1 : 0) - (b.type === 'boss' ? 1 : 0));
  const quizMissions = flowMissions.filter((m: any) => m.type !== 'boss');
  const bossMission = flowMissions.find((m: any) => m.type === 'boss');
  const bossHpMax = Number(game?.bossHp) || 1000;
  const bossHits = Array.isArray(session?.bossHits) ? session.bossHits.length : 0;
  const bossHpLeft =
    typeof session?.bossHpLeft === 'number'
      ? session.bossHpLeft
      : Math.max(0, bossHpMax - bossHits * BOSS_DAMAGE_PER_CORRECT);
  const bossDefeated = bossHpLeft <= 0;

  const posMission = Number(player?.posMission) || 0;
  const posQuestion = Number(player?.posQuestion) || 0;
  const quizDone = Boolean(player?.quizDone) || quizMissions.length === 0;
  const bossPos = Number(player?.bossPos) || 0;
  const bossDone = Boolean(player?.bossDone);

  const quizQuestion = quizMissions[posMission]?.questions?.[posQuestion];
  const inQuizQuestion = !quizDone && !!quizQuestion;
  const bossQuestion = bossMission?.questions?.[bossPos];
  const inBossQuestion = quizDone && isBossPhase && bossMission && !bossDone && !!bossQuestion;

  // "เอกลักษณ์ข้อ" — เปลี่ยนเมื่อขึ้นข้อใหม่ (ใช้รีเซ็ตนาฬิกา)
  // ต้องมี session แล้วเท่านั้น ไม่งั้น reset effect จะยิงตอนที่ข้อมูลยังไม่มา (pos default 0,0)
  // แล้ว re-anchor ไปยึดเวลาที่เหลือเก่าของนาฬิกา global แทนที่จะให้งบเต็ม 60 วิต่อคน
  const questionKey = !session
    ? ''
    : inQuizQuestion
      ? `q:${posMission}:${posQuestion}`
      : inBossQuestion
        ? `b:${bossPos}`
        : '';

  // ซิงค์ค่า re-render เข้า ref เพื่อใช้ใน interval (closure ไม่ค้างค่าเก่า)
  answerRef.current = answer;
  questionActiveRef.current = Boolean(inQuizQuestion || inBossQuestion);

  // ขึ้นข้อใหม่ → นาฬิกาเริ่มเดินใหม่จากงบเวลาของ session.timeLimit
  useEffect(() => {
    const t = Number(session?.timeLimit) || 0;
    budgetRef.current = t;
    prevBudgetRef.current = t;
    startRef.current = Date.now();
    frozenLeftRef.current = null;
    firedTimeoutRef.current = false;
    elapsedRef.current = 0; // เริ่มนับเวลาที่ใช้ใหม่
    setNow(Date.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionKey]);

  // ครูกดตั้ง/+/− เวลา → ปรับเวลาที่เหลือของคนที่กำลังทำข้อนี้อยู่ด้วย
  // ใช้ session.timeLeft (ที่เซิร์ฟเวอร์คำนวณให้แล้ว: set=ค่าใหม่, +/−=คงเหลือ±) เป็นฐาน
  useEffect(() => {
    const t = Number(session?.timeLimit) || 0;
    const prev = prevBudgetRef.current;
    if (t !== prev && questionKey) {
      prevBudgetRef.current = t;
      budgetRef.current = t;
      const serverLeft = Math.max(0, Number(session?.timeLeft) || 0);
      if (Boolean(session?.timeRunning)) {
        // กำลังเล่น → ยึดเวลาที่เหลือจริงที่เหลือของข้อนี้ (ยังอยู่ข้อเดิม ไม่ข้าม)
        // startRef = now - (งบใหม่ ที่เหลือจริงที่ครูสั่ง)  => show = งบใหม่ − ... = เวลาที่เหลือ
        startRef.current = Date.now() - (budgetRef.current - serverLeft) * 1000;
        frozenLeftRef.current = null;
      } else if (t > 0) {
        // ครูกดหยุดอยู่ → เก็บเวลาที่เหลือใหม่เอาไว้ (ไม่นับต่อจนกว่าจะเล่นต่อ)
        frozenLeftRef.current = serverLeft;
      }
      setNow(Date.now());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.timeLimit, session?.timeLeft, questionKey]);

  // ครูกดหยุด → freeze เวลาที่เหลือจริงๆ / กดเล่นต่อ → นับต่อจากค่าที่ freeze ไว้
  useEffect(() => {
    const running = Boolean(session?.timeRunning);
    const wasRunning = timeRunningRef.current;
    if (!running && wasRunning && questionKey && budgetRef.current > 0) {
      frozenLeftRef.current = Math.max(
        0,
        budgetRef.current - (Date.now() - startRef.current) / 1000
      );
    } else if (running && !wasRunning && frozenLeftRef.current != null) {
      // เล่นต่อ → นับต่อจากค่าที่ freeze ไว้: startRef ให้ display = frozenLeft
      startRef.current = Date.now() - (budgetRef.current - frozenLeftRef.current) * 1000;
      frozenLeftRef.current = null;
    }
    timeRunningRef.current = running;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.timeRunning, questionKey]);

  // เข็มนาฬิกาทุก 250 ms (นับเวลาที่ใช้ตอบจริงด้วย — ใช้คำนวณโบนัสตอบเร็ว)
  useEffect(() => {
    const t = setInterval(() => {
      if (timeRunningRef.current && questionActiveRef.current && !answerRef.current) {
        elapsedRef.current += 250;
      }
      setNow(Date.now());
    }, 250);
    return () => clearInterval(t);
  }, []);

  const timeLimit = Number(session?.timeLimit) || 0;
  const timeLeft =
    timeLimit > 0 && (inQuizQuestion || inBossQuestion) && !answer
      ? frozenLeftRef.current != null
        ? frozenLeftRef.current // ครูกดหยุดอยู่ → แสดงค่าที่ freeze ไว้คงเดิม
        : Math.max(0, timeLimit - (now - startRef.current) / 1000)
      : null;
  const timePct = timeLimit > 0 ? Math.max(0, Math.min(100, ((timeLeft ?? timeLimit) / timeLimit) * 100)) : 0;
  const timeUp = timeLeft != null && timeLeft <= 0;

  // เอา position จากเซิร์ฟเวอร์มาใส่ player (ตอบถูก = เลื่อนแล้วฝั่งเซิร์ฟเวอร์)
  const applyPos = useCallback((d: any) => {
    if (!d) return;
    setPlayer((p: any) => ({
      ...(p || {}),
      posMission: Number(d.posMission) ?? 0,
      posQuestion: Number(d.posQuestion) ?? 0,
      quizDone: Boolean(d.quizDone),
      bossPos: Number(d.bossPos) ?? 0,
      bossDone: Boolean(d.bossDone),
    }));
  }, []);

  const advanceNow = useCallback(async () => {
    if (!playerId) return;
    try {
      const r = await fetch('/api/players/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      }).then((x) => x.json());
      if (r.success) applyPos(r.data);
    } catch {
      /* ไม่ critical — poll ต่อไปจะเห็นข้อมูลจริง */
    }
  }, [playerId, applyPos]);

  const showToast = useCallback((text: string) => {
    setToast({ id: Date.now(), text });
    window.setTimeout(() => setToast((t) => (t && Date.now() - t.id > 1800 ? null : t)), 1900);
  }, []);

  // หมดเวลาข้อนี้ → ข้ามไปข้อถัดไปอัตโนมัติ
  useEffect(() => {
    if (!timeRunningRef.current) return;
    if (!(inQuizQuestion || inBossQuestion) || answer) return;
    const budget = budgetRef.current;
    if (budget <= 0) return;
    const remaining = budget - (Date.now() - startRef.current) / 1000;
    if (remaining <= 0 && !firedTimeoutRef.current) {
      firedTimeoutRef.current = true;
      showToast('⏰ หมดเวลาแล้ว — ข้ามข้อถัดไป');
      advanceNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, inQuizQuestion, inBossQuestion, answer]);

  const submit = async () => {
    if (selected == null || !playerId || !((inQuizQuestion && quizQuestion) || (inBossQuestion && bossQuestion))) return;
    const mission = inQuizQuestion ? quizMissions[posMission] : bossMission;
    const question = inQuizQuestion ? quizQuestion : bossQuestion;
    if (!mission || !question) return;
    setSubmitting(true);
    setError('');
    try {
      const r = await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          gameId,
          missionId: mission.id,
          questionId: question.id,
          selectedAnswer: selected,
          timeTakenSec: elapsedRef.current / 1000,
        }),
      }).then((x) => x.json());
      if (!r.success) {
        setError(r.error || 'ส่งคำตอบไม่สำเร็จ');
        return;
      }
      const d = r.data;
      if (d.correct) {
        // ✅ ตอบถูก → ขยับข้อถัดไปทันที (ไม่ต้องรอครู!)
        applyPos(d);
        setSelected(null);
        setAnswer(null);
        showToast(
          `🎉 ถูกต้อง! +${d.xpGained} XP${d.speedBonus ? ` ⚡เร็ว +${d.speedBonus}` : ''}${
            d.bossHit ? ` ⚔️ บอสเหลือ ${d.bossHpLeft ?? '?'} HP` : ''
          }`
        );
      } else {
        // ❌ ตอบผิด → ดูเฉลย + กด "ไปข้อถัดไป" เอง
        setAnswer(d);
        setSelected(null);
      }
    } catch {
      setError('ส่งคำตอบไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  const bg =
    'min-h-screen bg-gradient-to-br from-sky-50 via-lavender-50 to-mint-50 flex items-center justify-center p-4';

  if (loading) {
    return (
      <div className={bg}>
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">{MASCOT.emoji}</div>
          <p className="text-quest-text/60">กำลังโหลดเกม...</p>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className={bg}>
        <div className="text-center">
          <div className="text-6xl mb-4">😢</div>
          <h2 className="text-xl font-bold mb-4">ไม่พบเกม</h2>
          <Link href="/student/join" className="btn-primary">
            กลับหน้าเข้าร่วม
          </Link>
        </div>
      </div>
    );
  }

  // จบเกมแล้ว
  if (status === 'completed') {
    return (
      <div className={bg}>
        <div className="card w-full max-w-md p-8 text-center">
          <div className="text-7xl mb-4 animate-float">🎉</div>
          <h2 className="text-2xl font-bold mb-2">เกมจบแล้ว!</h2>
          <p className="text-quest-text/60 mb-6">ดูผลการเล่นของคุณได้เลย</p>
          <Link
            href={`/student/me?studentId=${new URLSearchParams(window.location.search).get('studentId') || ''}&gameId=${gameId}`}
            className="btn-primary w-full"
          >
            📊 ดูผลของฉัน
          </Link>
        </div>
      </div>
    );
  }

  // ยังอยู่ในห้องรอ / ครูหยุดเกม
  if (status !== 'question' && status !== 'boss') {
    return (
      <div className={bg}>
        <div className="card w-full max-w-md p-8 text-center">
          <div className="text-6xl mb-4 animate-bounce">{MASCOT.emoji}</div>
          <h2 className="text-xl font-bold mb-2">
            {status === 'paused' ? '⏸️ หยุดชั่วคราว' : 'รอครูเริ่มเกม...'}
          </h2>
          <p className="text-quest-text/60">
            {status === 'paused' ? 'ครูหยุดเกมไว้ชั่วคราว เดี๋ยวเล่นต่อ!' : 'อยู่ในห้องรอ อย่าออกไปไหน!'}
          </p>
        </div>
      </div>
    );
  }

  // ตอบครบทุกข้อควิซแล้ว
  if (quizDone) {
    // ยังไม่ถึงด่านบอส (ครูยังไม่เปิด)
    if (!isBossPhase) {
      return (
        <div className={bg}>
          <div className="card w-full max-w-md p-8 text-center">
            <div className="text-7xl mb-4 animate-float">🎉</div>
            <h2 className="text-xl font-bold mb-2">ตอบครบทุกข้อแล้ว!</h2>
            <p className="text-quest-text/60">
              {bossMission ? 'รอครูเปิดด่านบอส...' : 'รอครูจบเกมเพื่อดูผล...'}
            </p>
          </div>
        </div>
      );
    }

    // เกมที่ไม่มีด่านบอส → รอครูจบเกม
    if (!bossMission) {
      return (
        <div className={bg}>
          <div className="card w-full max-w-md p-8 text-center">
            <div className="text-7xl mb-4 animate-float">🏆</div>
            <h2 className="text-xl font-bold mb-2">ทำครบทุกข้อแล้ว!</h2>
            <p className="text-quest-text/60">รอครูจบเกมเพื่อดูผล...</p>
          </div>
        </div>
      );
    }

    // สู้บอสครบแล้ว → รอครูจบเกม
    if (bossDone) {
      return (
        <div className={bg}>
          <div className="card w-full max-w-md p-8 text-center">
            <div className="text-7xl mb-4 animate-float">🏰</div>
            <h2 className="text-xl font-bold mb-2">สู้บอสครบแล้ว!</h2>
            <p className="text-quest-text/60">
              {bossDefeated ? 'บอสแพ้แล้ว รอครูสรุปผล...' : 'รอครูจบเกมเพื่อดูผล...'}
            </p>
            <div className="mt-5">
              <div className="flex justify-between mb-2 text-sm">
                <span className="font-medium">HP บอส</span>
                <span className="text-quest-text/60">
                  {bossHpLeft} / {bossHpMax}
                </span>
              </div>
              <div className="w-full h-5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    bossDefeated ? 'bg-accent-400' : 'bg-gradient-to-r from-red-400 to-red-500'
                  }`}
                  style={{ width: `${bossHpMax > 0 ? Math.max(0, (bossHpLeft / bossHpMax) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ด่านบอสแบบเก่า (ไม่มีคำถามบอส) → ดู HP รอครูโจมตีเอง
    if (!bossMission.questions?.length) {
      return (
        <div className={bg}>
          <div className="card w-full max-w-md p-8 text-center">
            <div className="text-7xl mb-4 animate-bounce-soft">👹</div>
            <h2 className="text-xl font-bold mb-1">{game.bossName || 'บอส'}</h2>
            <p className="text-quest-text/60 mb-6">ต่อสู้ตอนท้าย!</p>
            <div className="mb-6">
              <div className="flex justify-between mb-2 text-sm">
                <span className="font-medium">HP บอส</span>
                <span className="text-quest-text/60">
                  {bossHpLeft} / {bossHpMax}
                </span>
              </div>
              <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(0, (bossHpLeft / bossHpMax) * 100)}%` }}
                />
              </div>
            </div>
            <p className="text-quest-text/60">รอครูจัดการบอส...</p>
          </div>
        </div>
      );
    }
  }

  // ข้อที่กำลังแสดง = ข้อควิซ หรือคำถามบอส
  const showQuestion = inQuizQuestion || inBossQuestion;

  return (
    <div className={bg}>
      <div className="fixed top-4 left-4 z-50">
        <Link href="/student/join" title="กลับหน้าหลัก" className="text-2xl text-quest-text/60 hover:text-quest-sky transition-colors">
          🏠
        </Link>
      </div>
      <div className="card w-full max-w-md p-6">
        {toast && (
          <div
            key={toast.id}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-float px-5 py-3 rounded-2xl bg-white shadow-card border-2 border-green-200 text-sm font-bold text-green-700 whitespace-nowrap"
          >
            {toast.text}
          </div>
        )}

        {inBossQuestion ? (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <span className={`text-4xl ${bossDefeated ? 'animate-float' : 'animate-bounce-soft'}`}>
                  {bossDefeated ? '🎉' : '👹'}
                </span>
                <div>
                  <p className="font-bold leading-tight">{game.bossName || 'บอส'}</p>
                  <p className="text-xs text-quest-text/60">{bossMission?.title}</p>
                </div>
              </div>
              <span className="text-sm font-medium tabular-nums">
                {bossHpLeft} / {bossHpMax}
              </span>
            </div>
            <div className="w-full h-5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  bossDefeated ? 'bg-accent-400' : 'bg-gradient-to-r from-red-400 to-red-500'
                }`}
                style={{ width: `${bossHpMax > 0 ? Math.max(0, (bossHpLeft / bossHpMax) * 100) : 0}%` }}
              />
            </div>
            <p className="text-xs text-quest-text/60 mt-1.5 text-center">
              {bossDefeated ? '🎉 ชนะบอสแล้ว!' : `ตอบถูก = บอสเสีย ${BOSS_DAMAGE_PER_CORRECT} HP!`}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium text-sm">
                Mission {posMission + 1}/{quizMissions.length}
              </span>
              <span className="text-quest-text/60 text-sm">คำถามที่ {posQuestion + 1}</span>
            </div>

            <div className="flex gap-1.5 mb-6">
              {quizMissions.map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded-full ${
                    i < posMission ? 'bg-green-400' : i === posMission ? 'bg-quest-sky' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {timeLeft != null && !answer && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span
                className={`font-medium ${
                  timeUp ? 'text-red-500' : timeLeft <= 10 ? 'text-warm-500' : 'text-quest-text/60'
                }`}
              >
                {timeUp ? '⏰ หมดเวลาแล้ว!' : '⏳ เวลาของข้อนี้'}
              </span>
              <span
                className={`font-bold tabular-nums ${
                  timeUp ? 'text-red-500' : timeLeft <= 10 ? 'text-warm-500' : 'text-quest-text/70'
                }`}
              >
                {timeUp ? '0' : Math.ceil(timeLeft)} วินาที
              </span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-300 ${
                  timeUp ? 'bg-red-400' : timeLeft <= 10 ? 'bg-warm-400' : 'bg-accent-400'
                }`}
                style={{ width: `${timePct}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        {!showQuestion ? (
          <div className="text-center py-6">
            <div className="text-6xl mb-3">📖</div>
            <p className="text-quest-text/60">ยังไม่มีคำถามในเกมนี้</p>
          </div>
        ) : !answer ? (
          <>
            <p className="text-lg font-medium mb-4">{(inBossQuestion ? bossQuestion : quizQuestion).text}</p>
            <div className="space-y-2.5 mb-6">
              {((inBossQuestion ? bossQuestion : quizQuestion).options || []).map((o: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setSelected(i)}
                  disabled={timeUp}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all disabled:opacity-50 ${
                    selected === i
                      ? 'border-quest-sky bg-sky-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium">{String.fromCharCode(65 + i)}.</span> {o}
                </button>
              ))}
            </div>
            <button
              onClick={submit}
              disabled={selected == null || submitting}
              className="btn-primary w-full disabled:opacity-50"
            >
              {submitting ? 'กำลังส่ง...' : 'ตอบ'}
            </button>
          </>
        ) : (
          <div className="text-center space-y-3">
            <div className="text-6xl">💪</div>
            <h3 className="text-xl font-bold text-orange-500">ยังไม่ถูกนะ</h3>

            <div className="p-4 bg-green-50 rounded-2xl text-left">
              <p className="text-xs font-medium text-green-700 mb-1">✅ คำตอบที่ถูกคือ</p>
              <p className="text-sm text-green-800 font-medium">
                {String.fromCharCode(65 + Number(answer.correctAnswer))}.{' '}
                {(inBossQuestion ? bossQuestion : quizQuestion)?.options?.[Number(answer.correctAnswer)] || ''}
              </p>
            </div>

            {answer.explanation && (
              <div className="p-4 bg-orange-50 rounded-2xl text-left">
                <p className="text-xs font-medium text-orange-700 mb-1">💡 เรียนรู้อะไรได้</p>
                <p className="text-sm text-orange-700">{answer.explanation}</p>
              </div>
            )}

            <button
              onClick={() => {
                setAnswer(null);
                advanceNow();
              }}
              className="btn-primary w-full"
            >
              ไปข้อถัดไป →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}