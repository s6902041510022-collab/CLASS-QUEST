'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MASCOT } from '@/lib/utils';

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
          const key = `${r.data?.status}-${r.data?.currentMissionIndex}-${r.data?.currentQuestionIndex}`;
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
  const mission = missions[mIdx];
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

  // BOSS
  if (status === 'boss') {
    const hp = session?.bossHp ?? game.bossHp;
    const max = game.bossHp || 1000;
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
                {hp} / {max}
              </span>
            </div>
            <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.max(0, (hp / max) * 100)}%` }}
              />
            </div>
          </div>
          <p className="text-quest-text/60">รอครูสั่งโจมตี...</p>
        </div>
      </div>
    );
  }

  // หยุด / ยังไม่มีคำถาม
  if (status !== 'question' || !question) {
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
        <div className="flex items-center justify-between mb-4">
          <span className="font-medium text-sm">
            Mission {mIdx + 1}/{missions.length}
          </span>
          <span className="text-quest-text/60 text-sm">คำถามที่ {qIdx + 1}</span>
        </div>

        <div className="flex gap-1.5 mb-6">
          {missions.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-2 rounded-full ${
                i < mIdx ? 'bg-green-400' : i === mIdx ? 'bg-quest-sky' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

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
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
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

            {answer.explanation && (
              <div className="p-4 bg-orange-50 rounded-2xl text-left">
                <p className="text-xs font-medium text-orange-700 mb-1">💡 เรียนรู้อะไรได้</p>
                <p className="text-sm text-orange-700">{answer.explanation}</p>
              </div>
            )}

            <p className="text-quest-text/60 text-sm pt-1">รอครูไปคำถามถัดไป...</p>
          </div>
        )}
      </div>
    </div>
  );
}
