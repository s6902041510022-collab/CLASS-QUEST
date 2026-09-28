'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MASCOT } from '@/lib/utils';
import { clearTeacherSession } from '@/lib/auth';

export default function LiveGameControlPage({ params }: { params: { id: string } }) {
  const gameId = params.id;
  const router = useRouter();

  const [game, setGame] = useState<any>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const status = session?.status || 'lobby';
  const missionIndex = session?.currentMissionIndex ?? 0;
  const questionIndex = session?.currentQuestionIndex ?? 0;
  const mission = missions[missionIndex];
  const question = mission?.questions?.[questionIndex];

  const loadStatic = useCallback(async () => {
    try {
      const [gameRes, missionsRes] = await Promise.all([
        fetch(`/api/games/${gameId}`),
        fetch(`/api/missions?gameId=${gameId}`),
      ]);
      const gameData = await gameRes.json();
      const missionsData = await missionsRes.json();
      if (gameData.success) setGame(gameData.data);
      if (missionsData.success) setMissions(missionsData.data || []);
    } catch {
      setError('โหลดข้อมูลเกมไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  // ดูสถานะสดจากนักเรียน + session
  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const [sessionRes, playersRes] = await Promise.all([
          fetch(`/api/sessions?gameId=${gameId}`),
          fetch(`/api/players?gameId=${gameId}`),
        ]);
        const sessionData = await sessionRes.json();
        const playersData = await playersRes.json();
        if (cancelled) return;
        setSession(sessionData.success ? sessionData.data : null);
        if (playersData.success) setPlayers(playersData.data || []);
      } catch {
        /* ไม่ critical */
      }
    };

    loadStatic();
    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [gameId, loadStatic]);

  // ---------- การควบคุมเกม ----------

  const updateSession = async (updates: any) => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, ...updates }),
      });
      const result = await response.json();
      if (result.success) setSession(result.data);
      else setError(result.error || 'ทำรายการไม่สำเร็จ');
    } catch {
      setError('ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setBusy(false);
    }
  };

  const startGame = async () => {
    setBusy(true);
    setError('');
    try {
      // ถ้ายังมีห้องค้างอยู่ (นักเรียนเข้ารออยู่แล้ว) ให้ใช้ห้องนั้นเลย
      // สร้างใหม่เฉพาะตอนไม่มีห้อง หรือห้องเดิมจบไปแล้ว
      if (!session || status === 'completed') {
        const createRes = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId, force: true }),
        });
        const created = await createRes.json();
        if (!created.success) throw new Error();
      }

      const response = await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          status: 'question',
          currentMissionIndex: 0,
          currentQuestionIndex: 0,
          startedAt: new Date().toISOString(),
        }),
      });
      const result = await response.json();
      if (result.success) setSession(result.data);
      else setError(result.error || 'เริ่มเกมไม่สำเร็จ');
    } catch {
      setError('เริ่มเกมไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setBusy(false);
    }
  };

  // ปุ่มหลักตามสถานะ
  const goNext = () => {
    if (missionIndex + 1 < missions.length) {
      updateSession({
        status: 'question',
        currentMissionIndex: missionIndex + 1,
        currentQuestionIndex: 0,
      });
    } else {
      // จบ mission → เข้า boss phase
      updateSession({ status: 'boss', bossHp: game?.bossHp || 1000 });
    }
  };

  const goBack = () => {
    if (questionIndex > 0) {
      updateSession({ currentQuestionIndex: questionIndex - 1 });
    } else if (missionIndex > 0) {
      updateSession({ currentMissionIndex: missionIndex - 1, currentQuestionIndex: 0 });
    }
  };

  const attackBoss = () => {
    const max = game?.bossHp || 1000;
    const current = session?.bossHp ?? max;
    const damage = 100;
    const next = Math.max(0, current - damage);
    updateSession(next <= 0 ? { status: 'completed', bossHp: 0, endedAt: new Date().toISOString() } : { bossHp: next });
  };

  const endGame = () => {
    updateSession({ status: 'completed', endedAt: new Date().toISOString() });
  };

  const handleLogout = () => {
    clearTeacherSession();
    router.push('/teacher/login');
  };

  const copyJoinLink = async () => {
    const url = `${window.location.origin}/student/join`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('คัดลอกลิงก์ไม่สำเร็จ');
    }
  };

  const copyRoomCode = async () => {
    if (!game?.roomCode) return;
    try {
      await navigator.clipboard.writeText(game.roomCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      setError('คัดลอก Room Code ไม่สำเร็จ');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">{MASCOT.emoji}</div>
          <p className="text-quest-text/60">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card w-full max-w-md p-8 text-center">
          <div className="text-6xl mb-4">😢</div>
          <h2 className="text-xl font-bold mb-2">ไม่พบเกม</h2>
          <p className="text-quest-text/60 mb-6">เกมนี้อาจถูกลบหรือไม่มีอยู่</p>
          <Link href="/teacher/games" className="btn-primary">
            กลับหน้าเกมของฉัน
          </Link>
        </div>
      </div>
    );
  }

  const answeredCount = players.filter((p) => {
    const m = missions[missionIndex];
    const q = m?.questions?.[questionIndex];
    if (!m || !q) return false;
    return (p.answers || []).some((a: any) => a.missionId === m.id && a.questionId === q.id);
  }).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/teacher/games" className="text-quest-text/60 hover:text-quest-sky">
                ←
              </Link>
              <span className="text-2xl shrink-0">{MASCOT.emoji}</span>
              <div className="min-w-0">
                <h1 className="font-bold truncate">{game.name || 'ไม่มีชื่อ'}</h1>
                <p className="text-sm text-quest-text/60">🔑 Room: {game.roomCode}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  status === 'question'
                    ? 'bg-green-100 text-green-700'
                    : status === 'boss'
                      ? 'bg-red-100 text-red-700'
                      : status === 'paused'
                        ? 'bg-yellow-100 text-yellow-700'
                        : status === 'completed'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                }`}
              >
                {status === 'question'
                  ? 'กำลังเล่น'
                  : status === 'boss'
                    ? 'BOSS BATTLE'
                    : status === 'paused'
                      ? 'หยุดชั่วคราว'
                      : status === 'completed'
                        ? 'จบแล้ว'
                        : 'รอเริ่ม'}
              </span>
              <span className="text-quest-text/60">👥 {players.length}</span>
              <button
                onClick={copyRoomCode}
                title="คัดลอก Room Code"
                className="px-3 py-2 rounded-2xl bg-lavender-50 text-purple-700 text-sm font-medium hover:bg-lavender-100"
              >
                🔑 {codeCopied ? 'คัดลอกแล้ว ✓' : game.roomCode}
              </button>
              <button
                onClick={copyJoinLink}
                className="px-3 py-2 rounded-2xl bg-sky-50 text-sky-700 text-sm font-medium hover:bg-sky-100"
              >
                {copied ? 'คัดลอกแล้ว ✓' : '🔗 ลิงก์เข้าร่วม'}
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded-2xl bg-gray-100 text-quest-text hover:bg-gray-200 text-sm font-medium"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-2xl">{error}</div>
        )}

        {missions.length === 0 && (
          <div className="card p-8 text-center mb-6">
            <div className="text-5xl mb-4">📝</div>
            <h3 className="text-lg font-bold mb-1">เกมนี้ยังไม่มีคำถาม</h3>
            <p className="text-quest-text/60 mb-5">เพิ่ม Mission และคำถามก่อนเปิดห้องเล่น</p>
            <Link href={`/teacher/missions?gameId=${gameId}`} className="btn-primary">
              ไปเพิ่มคำถาม →
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ส่วนควบคุม */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              {/* สถานะปัจจุบัน */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-2xl">
                  <p className="text-2xl font-bold">
                    {missions.length ? missionIndex + 1 : 0}/{missions.length}
                  </p>
                  <p className="text-xs text-quest-text/60">Mission</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-2xl">
                  <p className="text-2xl font-bold">
                    {answeredCount}/{players.length || 0}
                  </p>
                  <p className="text-xs text-quest-text/60">ตอบแล้ว</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-2xl">
                  <p className="text-2xl font-bold">{Math.round((game.timeLimit || 300) / 60)}</p>
                  <p className="text-xs text-quest-text/60">นาที</p>
                </div>
              </div>

              {/* คำถามที่กำลังเล่น */}
              {status === 'question' && question ? (
                <div className="p-4 bg-sky-50 rounded-2xl mb-6">
                  <p className="text-xs text-quest-text/60 mb-1">
                    {mission?.title} • คำถามที่ {questionIndex + 1}
                  </p>
                  <p className="font-medium mb-3">{question.text}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(question.options || []).map((option: string, i: number) => (
                      <div
                        key={i}
                        className={`p-2.5 rounded-xl text-sm ${
                          i === question.correctAnswer
                            ? 'bg-green-100 text-green-800 font-medium'
                            : 'bg-white text-quest-text/70'
                        }`}
                      >
                        {String.fromCharCode(65 + i)}. {option}
                        {i === question.correctAnswer ? ' (ถูกต้อง)' : ''}
                      </div>
                    ))}
                  </div>
                </div>
              ) : status === 'boss' ? (
                <div className="p-4 bg-red-50 rounded-2xl mb-6 text-center">
                  <div className="text-4xl mb-2">👹</div>
                  <p className="font-bold mb-1">{game.bossName}</p>
                  <div className="w-full h-4 bg-white rounded-full overflow-hidden mt-3">
                    <div
                      className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.max(0, ((session?.bossHp ?? game.bossHp) / (game.bossHp || 1000)) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-sm text-quest-text/60 mt-2">
                    HP: {session?.bossHp ?? game.bossHp} / {game.bossHp}
                  </p>
                </div>
              ) : null}

              {/* ปุ่มควบคุม */}
              {status === 'lobby' || status === 'completed' ? (
                <button
                  onClick={startGame}
                  disabled={busy || missions.length === 0}
                  className="w-full p-4 rounded-2xl bg-green-500 text-white font-bold text-lg hover:bg-green-600 transition-all disabled:opacity-50"
                >
                  🚀 {status === 'completed' ? 'เริ่มเกมใหม่' : 'เริ่มเกม'}
                </button>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {status === 'question' ? (
                    <>
                      <button
                        onClick={goNext}
                        disabled={busy}
                        className="col-span-2 sm:col-span-4 p-4 rounded-2xl bg-quest-sky text-white font-bold text-lg hover:opacity-90 disabled:opacity-50"
                      >
                        ⏭️ ถัดไป
                      </button>
                      <button
                        onClick={goBack}
                        disabled={busy || (questionIndex === 0 && missionIndex === 0)}
                        className="p-3 rounded-2xl bg-gray-100 hover:bg-gray-200 font-medium disabled:opacity-40"
                      >
                        ← ย้อนกลับ
                      </button>
                      <button
                        onClick={() => updateSession({ status: 'paused' })}
                        disabled={busy}
                        className="p-3 rounded-2xl bg-yellow-100 text-yellow-700 hover:bg-yellow-200 font-medium"
                      >
                        ⏸️ หยุด
                      </button>
                      <button
                        onClick={endGame}
                        disabled={busy}
                        className="p-3 rounded-2xl bg-gray-100 hover:bg-gray-200 font-medium"
                      >
                        🏁 จบเกม
                      </button>
                      <button
                        onClick={() => router.push(`/teacher/analytics?gameId=${gameId}`)}
                        className="p-3 rounded-2xl bg-lavender-100 text-purple-700 hover:bg-lavender-200 font-medium"
                      >
                        📊 ดูผล
                      </button>
                    </>
                  ) : status === 'paused' ? (
                    <button
                      onClick={() => updateSession({ status: 'question' })}
                      disabled={busy}
                      className="col-span-2 sm:col-span-4 p-4 rounded-2xl bg-green-500 text-white font-bold text-lg hover:bg-green-600"
                    >
                      ▶️ เล่นต่อ
                    </button>
                  ) : status === 'boss' ? (
                    <>
                      <button
                        onClick={attackBoss}
                        disabled={busy}
                        className="col-span-2 sm:col-span-4 p-4 rounded-2xl bg-red-500 text-white font-bold text-lg hover:bg-red-600 disabled:opacity-50"
                      >
                        ⚔️ โจมตี (-100 HP)
                      </button>
                      <button
                        onClick={() => updateSession({ status: 'paused' })}
                        disabled={busy}
                        className="p-3 rounded-2xl bg-yellow-100 text-yellow-700 hover:bg-yellow-200 font-medium"
                      >
                        ⏸️ หยุด
                      </button>
                      <button
                        onClick={endGame}
                        disabled={busy}
                        className="p-3 rounded-2xl bg-gray-100 hover:bg-gray-200 font-medium"
                      >
                        🏁 จบเกม
                      </button>
                    </>
                  ) : null}
                </div>
              )}
            </div>

            {/* รายการ Mission */}
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4">Mission ทั้งหมด</h2>
              {missions.length === 0 ? (
                <p className="text-quest-text/60 text-center py-6">ยังไม่มี Mission</p>
              ) : (
                <div className="space-y-2">
                  {missions.map((m: any, index: number) => {
                    const isCurrent = index === missionIndex && status === 'question';
                    const isDone = index < missionIndex || status === 'boss' || status === 'completed';
                    return (
                      <div
                        key={m.id}
                        className={`flex items-center justify-between p-3 rounded-2xl ${
                          isCurrent
                            ? 'bg-sky-50 border-2 border-quest-sky'
                            : isDone
                              ? 'bg-green-50'
                              : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                              isDone
                                ? 'bg-green-500 text-white'
                                : isCurrent
                                  ? 'bg-quest-sky text-white'
                                  : 'bg-gray-200 text-gray-500'
                            }`}
                          >
                            {isDone ? '✓' : index + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{m.title}</p>
                            <p className="text-xs text-quest-text/60">
                              {m.questions?.length || 0} คำถาม • {m.xp} XP
                            </p>
                          </div>
                        </div>
                        {isCurrent && (
                          <span className="text-xs text-quest-sky font-medium shrink-0">กำลังเล่น</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ผู้เล่น */}
          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4">ผู้เล่น ({players.length})</h2>
              {players.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-4xl mb-2">⏳</div>
                  <p className="text-quest-text/60 text-sm">ยังไม่มีผู้เล่น</p>
                  <p className="text-quest-text/60 text-xs mt-2">
                    ให้นักเรียนเปิดลิงก์และใส่ Room Code
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {[...players]
                    .sort((a, b) => (b.xp || 0) - (a.xp || 0))
                    .map((p: any, index: number) => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-bold text-quest-text/40 w-4">{index + 1}</span>
                          <span className="text-xl">{p.avatar}</span>
                          <span className="font-medium text-sm truncate">{p.nickname}</span>
                        </div>
                        <span className="text-sm font-bold text-quest-sky shrink-0">
                          {p.xp || 0} XP
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
