'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MASCOT, BOSS_DAMAGE_PER_CORRECT } from '@/lib/utils';

export default function StudentGamePage({ params }: { params: { id: string } }) {
  const gameId = params.id;
  const router = useRouter();

  const [playerId, setPlayerId] = useState('');
  const [game, setGame] = useState<any>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [answer, setAnswer] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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

  // ดูสถานะจากครู — นี่คือหัวใจที่ทำให้ปุ่มของครูมีผลจริง
  // ถ้าข้อยังเหมือนเดิม (กำลังรอครูขยับข้อ) จะถามช้าลงเรื่อย ๆ เพื่อไม่ให้เปลืองเน็ต
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

  // รีเซ็ตคำตอบเมื่อครูเปลี่ยนคำถาม
  useEffect(() => {
    setSelected(null);
    setAnswer(null);
    setError('');
  }, [session?.currentMissionIndex, session?.currentQuestionIndex]);

  // ---------- จับเวลา ----------
  // นับเองบนเครื่อง โดยยึด "เวลาสิ้นสุด" จากเซิร์ฟเวอร์ — เบราว์เซอร์คนละเครื่องก็เห็นเวลาตรงกัน
  const [now, setNow] = useState(() => Date.now());
  const [deadline, setDeadline] = useState<number | null>(null);

  useEffect(() => {
    setDeadline(
      session?.timeRunning && session?.timeDeadline ? Number(session.timeDeadline) : null
    );
  }, [session?.timeRunning, session?.timeDeadline, session?.id]);

  useEffect(() => {
    if (deadline == null) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [deadline]);

  const timeLimit = Number(session?.timeLimit) || 0;
  const timeLeft = timeLimit
    ? deadline != null
      ? Math.max(0, Math.ceil((deadline - now) / 1000))
      : Math.max(0, Number(session?.timeLeft) || 0)
    : 0;
  const timeUp = timeLimit > 0 && timeLeft <= 0;
  const timePct = timeLimit > 0 ? Math.max(0, Math.min(100, (timeLeft / timeLimit) * 100)) : 0;

  const submit = useCallback(async () => {
    if (selected == null || !playerId) return;
    const mission = missions[session?.currentMissionIndex ?? 0];
    const question = mission?.questions?.[session?.currentQuestionIndex ?? 0];
    if (!question) return;
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
        }),
      }).then((x) => x.json());
      if (r.success) setAnswer(r.data);
      else setError(r.error || 'ส่งคำตอบไม่สำเร็จ');
    } catch {
      setError('ส่งคำตอบไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  }, [selected, playerId, gameId, session, missions]);

  const bg = 'min-h-screen bg-gradient-to-br from-sky-50 via-lavender-50 to-mint-50 flex items-center justify-center p-4';

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

  const status = session?.status || 'lobby';
  const mIdx = session?.currentMissionIndex ?? 0;
  const qIdx = session?.currentQuestionIndex ?? 0;

  // ลำดับเล่น = ด่านควิซก่อน แล้วด่านบอสต่อท้าย (ตรงกับเซิร์ฟเวอร์/หน้าครู)
  const flowMissions = [...missions]
    .sort((a: any, b: any) => a.order - b.order)
    .sort((a: any, b: any) => (a.type === 'boss' ? 1 : 0) - (b.type === 'boss' ? 1 : 0));
  const flowQuizMissions = flowMissions.filter((m: any) => m.type !== 'boss');
  const isBoss = status === 'boss';
  const bossHpMax = Number(game?.bossHp) || 1000;
  const bossHits = Array.isArray(session?.bossHits) ? session.bossHits.length : 0;
  const bossHpLeft =
    typeof session?.bossHpLeft === 'number'
      ? session.bossHpLeft
      : Math.max(0, bossHpMax - bossHits * BOSS_DAMAGE_PER_CORRECT);
  const bossDefeated = bossHpLeft <= 0;

  const mission = flowMissions[mIdx];
  const question = mission?.questions?.[qIdx];

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

  // BOSS (ยังไม่มีคำถามบอส = โหมดเก่า รอครูกดโจมตีเอง)
  if (status === 'boss' && !question) {
    return (
      <div className={bg}>
        <div className="card w-full max-w-md p-8 text-center">
          <div className="text-8xl mb-4 animate-bounce-soft">👹</div>
          <h2 className="text-2xl font-bold mb-1">{game.bossName}</h2>
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
          <p className="text-quest-text/60">รอครูสั่งโจมตี...</p>
        </div>
      </div>
    );
  }

  // หยุด / ยังไม่มีคำถาม
  if ((status !== 'question' && status !== 'boss') || !question) {
    return (
      <div className={bg}>
        <div className="card w-full max-w-md p-8 text-center">
          <div className="text-6xl mb-4 animate-bounce">{MASCOT.emoji}</div>
          <h2 className="text-xl font-bold mb-2">
            {status === 'paused' ? 'หยุดชั่วคราว' : 'รอครูเริ่มคำถาม'}
          </h2>
          <p className="text-quest-text/60">อยู่ในห้องรอ อย่าออกไปไหน!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={bg}>
      <div className="card w-full max-w-md p-6">
        {isBoss ? (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <span className={`text-4xl ${bossDefeated ? 'animate-float' : 'animate-bounce-soft'}`}>
                  {bossDefeated ? '🎉' : '👹'}
                </span>
                <div>
                  <p className="font-bold leading-tight">{game.bossName || 'บอส'}</p>
                  <p className="text-xs text-quest-text/60">{mission?.title}</p>
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
                Mission {mIdx + 1}/{flowQuizMissions.length}
              </span>
              <span className="text-quest-text/60 text-sm">คำถามที่ {qIdx + 1}</span>
            </div>

            <div className="flex gap-1.5 mb-6">
              {flowQuizMissions.map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded-full ${
                    i < mIdx ? 'bg-green-400' : i === mIdx ? 'bg-quest-sky' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {timeLimit > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span
                className={`font-medium ${
                  timeUp ? 'text-red-500' : timeLeft <= 10 ? 'text-warm-500' : 'text-quest-text/60'
                }`}
              >
                {timeUp ? '⏰ หมดเวลาแล้ว!' : '⏳ เหลืออีก'}
              </span>
              <span
                className={`font-bold tabular-nums ${
                  timeUp ? 'text-red-500' : timeLeft <= 10 ? 'text-warm-500' : 'text-quest-text/70'
                }`}
              >
                {timeUp ? '0' : timeLeft} วินาที
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

        {!answer ? (
          <>
            <p className="text-lg font-medium mb-4">{question.text}</p>
            <div className="space-y-2.5 mb-6">
              {(question.options || []).map((o: string, i: number) => (
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
            {timeUp ? (
              <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl text-center font-medium">
                ⏰ หมดเวลาแล้ว — รอครูไปข้อต่อไป
              </div>
            ) : (
              <button
                onClick={submit}
                disabled={selected == null || submitting}
                className="btn-primary w-full disabled:opacity-50"
              >
                {submitting ? 'กำลังส่ง...' : 'ตอบ'}
              </button>
            )}
          </>
        ) : (
          <div className="text-center space-y-3">
            <div className="text-6xl">{answer.correct ? '🎉' : '💪'}</div>
            <h3
              className={`text-xl font-bold ${answer.correct ? 'text-green-600' : 'text-orange-500'}`}
            >
              {answer.correct ? 'ถูกต้อง!' : 'ยังไม่ถูกนะ'}
            </h3>

            {answer.xpGained > 0 && (
              <div className="inline-block px-4 py-2 bg-green-100 text-green-700 rounded-full font-bold">
                +{answer.xpGained} XP
              </div>
            )}

            {answer.bossHit && (
              <div className="inline-block px-4 py-2 bg-red-100 text-red-700 rounded-full font-bold">
                ⚔️ บอสเสีย {BOSS_DAMAGE_PER_CORRECT} HP!
              </div>
            )}

            {answer.explanation && (
              <div className="p-4 bg-orange-50 rounded-2xl text-left">
                <p className="text-xs font-medium text-orange-700 mb-1">💡 เรียนรู้อะไรได้</p>
                <p className="text-sm text-orange-700">{answer.explanation}</p>
              </div>
            )}

            <p className="text-quest-text/60 text-sm pt-1">
              {isBoss ? 'รอครูไปคำถามบอสถัดไป...' : 'รอครูไปคำถามถัดไป...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
