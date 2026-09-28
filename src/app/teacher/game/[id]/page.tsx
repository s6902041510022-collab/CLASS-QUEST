'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MASCOT, BOSS_DAMAGE_PER_CORRECT } from '@/lib/utils';
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
  const [timeInput, setTimeInput] = useState(60);

  // ---------- จับเวลา ----------
  // นับถอยหลังบนเครื่องครูเอง โดยยึด "เวลาสิ้นสุด" ที่เซิร์ฟเวอร์ส่งมา
  // จึงไม่ต้องยิงเซิร์ฟเวอร์ทุกวินาที และตรงกับที่นักเรียนเห็นเสมอ
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
  const timeRunning = Boolean(session?.timeRunning);
  const timeLeft = timeLimit
    ? deadline != null
      ? Math.max(0, Math.ceil((deadline - now) / 1000))
      : Math.max(0, Number(session?.timeLeft) || 0)
    : 0;
  const timePct = timeLimit > 0 ? Math.max(0, Math.min(100, (timeLeft / timeLimit) * 100)) : 0;
  const timeColor = timeLeft <= 0 ? 'bg-primary-500' : timeLeft <= 10 ? 'bg-warm-400' : 'bg-accent-400';
  const mmss = (sec: number) =>
    `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

  const setTime = (timeAction: string, timeSeconds?: number) =>
    updateSession({ timeAction, ...(timeSeconds != null ? { timeSeconds } : {}) });

  const status = session?.status || 'lobby';

  // ลำดับเล่น = ด่านควิซทั้งหมดก่อน แล้วด่านบอสต่อท้ายเสมอ (ตรงกับเซิร์ฟเวอร์)
  const flowMissions = [...missions]
    .sort((a: any, b: any) => a.order - b.order)
    .sort((a: any, b: any) => (a.type === 'boss' ? 1 : 0) - (b.type === 'boss' ? 1 : 0));
  const quizCount = flowMissions.filter((m: any) => m.type !== 'boss').length;
  const bossMission = flowMissions.find((m: any) => m.type === 'boss');
  const bossIndex = bossMission ? flowMissions.indexOf(bossMission) : -1;
  const bossHpMax = Number(game?.bossHp) || 1000;
  const bossHits = Array.isArray(session?.bossHits) ? session.bossHits.length : 0;
  const bossHpLeft =
    typeof session?.bossHpLeft === 'number'
      ? session.bossHpLeft
      : Math.max(0, bossHpMax - bossHits * BOSS_DAMAGE_PER_CORRECT);
  const bossDefeated = bossHpLeft <= 0;

  // ความคืบหน้านักเรียน (โหมดนักเรียนไปเอง)
  const startedCount = players.filter((p: any) => (p.answers || []).length > 0).length;
  const quizDoneCount = players.filter((p: any) => p.quizDone || quizCount === 0).length;

  const progressLabel = (p: any) => {
    if (p.bossDone) return '⚔️ สู้บอสครบ';
    if (p.quizDone) return status === 'boss' ? '⚔️ สู้บอสอยู่' : '✅ ควิซครบ';
    return `Mission ${(Number(p.posMission) || 0) + 1} • ข้อ ${(Number(p.posQuestion) || 0) + 1}`;
  };

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
  // นักเรียนตอบถูกเลื่อนข้อเองแล้ว → ครูเหลือแค่ "เปิดด่านบอส" เท่านั้น
  const startBoss = () => {
    if (!bossMission || !session) return;
    updateSession({
      status: 'boss',
      currentMissionIndex: bossIndex,
      currentQuestionIndex: 0,
      bossHp: bossHpMax,
      bossHits: [],
    });
  };

  // ใช้เฉพาะเกมที่ไม่มีด่านบอส (โหมดเก่า) — ครูกดโจมตีเองทีละ 100 HP
  const attackBoss = () => {
    const current = session?.bossHp ?? bossHpMax;
    const next = Math.max(0, current - 100);
    updateSession(
      next <= 0
        ? { status: 'completed', bossHp: 0, endedAt: new Date().toISOString() }
        : { bossHp: next }
    );
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/teacher/dashboard" title="กลับหน้าหลักครู" className="text-xl text-quest-text/60 hover:text-quest-sky shrink-0">
                🏠
              </Link>
              <Link href="/teacher/games" className="text-quest-text/60 hover:text-quest-sky shrink-0">
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
                  <p className="text-2xl font-bold text-green-600">
                    {quizDoneCount}/{players.length || 0}
                  </p>
                  <p className="text-xs text-quest-text/60">✅ ควิซครบ</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-2xl">
                  <p className="text-2xl font-bold">
                    {startedCount}/{players.length || 0}
                  </p>
                  <p className="text-xs text-quest-text/60">⚡ เริ่มแล้ว</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-2xl">
                  <p
                    className={`text-2xl font-bold tabular-nums ${
                      timeLimit && timeLeft <= 10 ? 'text-warm-500' : ''
                    }`}
                  >
                    {timeLimit ? mmss(timeLeft) : '—'}
                  </p>
                  <p className="text-xs text-quest-text/60">
                    {timeLimit ? (timeRunning ? 'นับถอยหลัง' : 'หยุดเวลา') : 'ไม่จับเวลา'}
                  </p>
                </div>
              </div>

              {/* โหมดเล่นเร็ว — อธิบายให้นักเรียนไปเอง */}
              {status === 'question' ? (
                <div className="p-4 bg-sky-50 rounded-2xl mb-6">
                  <p className="font-medium mb-1">🎮 ทุกคนเล่นพร้อมกัน (โหมดนักเรียนไปเอง)</p>
                  <p className="text-sm text-quest-text/60">
                    นักเรียนตอบถูกแล้วจะเลื่อนไปข้อถัดไปทันที ไม่ต้องรอครูกด ครูดูความคืบหน้ารายคนได้จากรายชื่อด้านขวา
                  </p>
                </div>
              ) : status === 'boss' ? (
                <div className="p-4 bg-red-50 rounded-2xl mb-6">
                  <div className="text-center">
                    <div className="text-4xl mb-2">{bossDefeated ? '🎉' : '👹'}</div>
                    <p className="font-bold mb-1">{game.bossName}</p>
                    <div className="w-full h-4 bg-white rounded-full overflow-hidden mt-3">
                      <div
                        className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all duration-700"
                        style={{ width: `${bossHpMax > 0 ? Math.max(0, (bossHpLeft / bossHpMax) * 100) : 0}%` }}
                      />
                    </div>
                    <p className="text-sm text-quest-text/60 mt-2">
                      HP: {bossHpLeft} / {bossHpMax}
                      {bossMission && !bossDefeated ? ` • ตอบถูก = บอสเสีย ${BOSS_DAMAGE_PER_CORRECT} HP` : ''}
                      {!bossMission ? ' • โหมดเก่า (ครูกดโจมตีเอง)' : ''}
                    </p>
                    {bossDefeated && (
                      <p className="mt-2 font-bold text-green-600">🎉 ชนะบอสแล้ว!</p>
                    )}
                  </div>
                  {bossMission && (bossMission.questions?.length || 0) === 0 && (
                    <p className="text-center text-quest-text/60 text-sm mt-3">
                      ยังไม่มีคำถามบอส — นักเรียนจะเห็นหน้าจอ HP รอครูโจมตีเอง
                    </p>
                  )}
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
                      {bossMission && (
                        <button
                          onClick={startBoss}
                          disabled={busy || players.length === 0}
                          className="col-span-2 sm:col-span-4 p-4 rounded-2xl bg-primary-500 text-white font-bold text-lg hover:bg-primary-600 disabled:opacity-50"
                        >
                          ⚔️ เปิดด่านบอส
                        </button>
                      )}
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
                    bossMission ? (
                      <>
                        <button
                          onClick={endGame}
                          disabled={busy}
                          className="col-span-2 sm:col-span-4 p-4 rounded-2xl bg-gray-100 hover:bg-gray-200 font-bold text-lg"
                        >
                          🏁 จบเกม
                        </button>
                        <button
                          onClick={() => updateSession({ status: 'paused' })}
                          disabled={busy}
                          className="p-3 rounded-2xl bg-yellow-100 text-yellow-700 hover:bg-yellow-200 font-medium"
                        >
                          ⏸️ หยุด
                        </button>
                        <button
                          onClick={() => router.push(`/teacher/analytics?gameId=${gameId}`)}
                          className="p-3 rounded-2xl bg-lavender-100 text-purple-700 hover:bg-lavender-200 font-medium"
                        >
                          📊 ดูผล
                        </button>
                      </>
                    ) : (
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
                    )
                  ) : null}
                </div>
              )}
            </div>

            {/* จับเวลา */}
            <div className="card p-6">
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <h2 className="text-lg font-bold">⏱️ จับเวลา</h2>
                <span className="text-xs text-quest-text/60">
                  เวลาต่อข้อของนักเรียน: {timeLimit ? `${timeLimit} วินาที` : 'ไม่จับเวลา'} • กด +/− เปลี่ยนได้ระหว่างเล่น
                </span>
              </div>

              {timeLimit <= 0 ? (
                <>
                  <p className="text-quest-text/60 text-sm mb-3">
                    ตอนนี้ไม่จับเวลา — กดเพื่อเริ่มจับเวลาในข้อนี้
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {[30, 60, 90, 120].map((sec) => (
                      <button
                        key={sec}
                        onClick={() => setTime('set', sec)}
                        disabled={busy}
                        className="p-3 rounded-2xl bg-quest-sky text-white font-medium hover:opacity-90 disabled:opacity-50"
                      >
                        {sec} วิ
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 text-center p-4 bg-gray-50 rounded-2xl">
                      <p
                        className={`text-5xl font-bold tabular-nums ${
                          timeLeft <= 10 ? 'text-warm-500' : ''
                        }`}
                      >
                        {mmss(timeLeft)}
                      </p>
                      <p className="text-xs text-quest-text/60 mt-1">
                        {timeRunning ? '⏳ กำลังนับถอยหลัง' : '⏸️ หยุดอยู่'}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => setTime(timeRunning ? 'pause' : 'start')}
                        disabled={busy || (timeLeft <= 0 && !timeRunning)}
                        className={`px-4 py-3 rounded-2xl font-medium disabled:opacity-50 ${
                          timeRunning
                            ? 'bg-warm-100 text-warm-700 hover:bg-warm-200'
                            : 'bg-accent-500 text-white hover:bg-accent-600'
                        }`}
                      >
                        {timeRunning ? '⏸️ หยุด' : '▶️ เล่น'}
                      </button>
                      <button
                        onClick={() => setTime('set', timeLimit)}
                        disabled={busy}
                        className="px-4 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 font-medium disabled:opacity-50"
                      >
                        🔄 รีเซ็ต
                      </button>
                    </div>
                  </div>

                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-4">
                    <div
                      className={`h-full rounded-full transition-[width] duration-300 ${timeColor}`}
                      style={{ width: `${timePct}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <button
                      onClick={() => setTime('sub', 30)}
                      disabled={busy}
                      className="p-3 rounded-2xl bg-warm-100 text-warm-700 hover:bg-warm-200 font-medium disabled:opacity-50"
                    >
                      −30 วิ
                    </button>
                    <button
                      onClick={() => setTime('add', 30)}
                      disabled={busy}
                      className="p-3 rounded-2xl bg-accent-100 text-accent-700 hover:bg-accent-200 font-medium disabled:opacity-50"
                    >
                      +30 วิ
                    </button>
                    <button
                      onClick={() => setTime('sub', 60)}
                      disabled={busy}
                      className="p-3 rounded-2xl bg-warm-100 text-warm-700 hover:bg-warm-200 font-medium disabled:opacity-50"
                    >
                      −1 นาที
                    </button>
                    <button
                      onClick={() => setTime('add', 60)}
                      disabled={busy}
                      className="p-3 rounded-2xl bg-accent-100 text-accent-700 hover:bg-accent-200 font-medium disabled:opacity-50"
                    >
                      +1 นาที
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      max={3600}
                      value={timeInput}
                      onChange={(e) => setTimeInput(Number(e.target.value))}
                      className="input flex-1"
                      placeholder="วินาที"
                    />
                    <button
                      onClick={() => setTime('set', timeInput)}
                      disabled={busy}
                      className="btn-primary shrink-0 disabled:opacity-50"
                    >
                      ตั้งเวลา
                    </button>
                    <button
                      onClick={() => setTime('off')}
                      disabled={busy}
                      className="px-3 py-2 rounded-2xl bg-gray-100 hover:bg-gray-200 text-sm font-medium shrink-0 disabled:opacity-50"
                    >
                      ปิด
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* รายการ Mission */}
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4">Mission ทั้งหมด</h2>
              {missions.length === 0 ? (
                <p className="text-quest-text/60 text-center py-6">ยังไม่มี Mission</p>
              ) : (
                <div className="space-y-2">
                  {flowMissions.map((m: any, index: number) => {
                    const isBoss = m.type === 'boss';
                    const someActive = players.some((p: any) => !p.quizDone);
                    const isCurrent = isBoss
                      ? status === 'boss' && players.some((p: any) => p.quizDone && !p.bossDone)
                      : status !== 'boss' && someActive &&
                        players.some((p: any) => !p.quizDone && (Number(p.posMission) || 0) === index);
                    const isDone = players.length > 0 && (isBoss
                      ? players.every((p: any) => p.bossDone)
                      : players.every((p: any) => p.quizDone || (Number(p.posMission) || 0) > index));
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
                                  : isBoss
                                    ? 'bg-red-100 text-red-600'
                                    : 'bg-gray-200 text-gray-500'
                            }`}
                          >
                            {isDone ? '✓' : isBoss ? '👹' : index + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">
                              {m.title}
                              {isBoss && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-medium align-middle">
                                  BOSS
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-quest-text/60">
                              {m.questions?.length || 0} คำถาม • {m.xp} XP
                              {isBoss ? ` • ตอบถูก = บอสเสีย ${BOSS_DAMAGE_PER_CORRECT} HP` : ''}
                            </p>
                          </div>
                        </div>
                        {isCurrent && (
                          <span
                            className={`text-xs font-medium shrink-0 ${
                              isBoss ? 'text-red-500' : 'text-quest-sky'
                            }`}
                          >
                            {isBoss && status === 'boss' ? '⚔️ สู้อยู่' : 'กำลังเล่น'}
                          </span>
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
                      <div key={p.id} className="p-3 bg-gray-50 rounded-2xl">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-bold text-quest-text/40 w-4">{index + 1}</span>
                          <span className="text-xl">{p.avatar}</span>
                          <span className="font-medium text-sm truncate flex-1">{p.nickname}</span>
                          <span className="text-sm font-bold text-quest-sky shrink-0">
                            {p.xp || 0} XP
                          </span>
                        </div>
                        <p className="text-xs text-quest-text/60 ml-8 mt-1">{progressLabel(p)}</p>
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
