'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { MASCOT } from '@/lib/utils';
import HomeButton from '@/components/HomeButton';

function Lobby() {
  const router = useRouter();
  const sp = useSearchParams();
  const gameId = sp.get('gameId') || '';
  const studentId = sp.get('studentId') || '';

  const [game, setGame] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    if (!gameId) {
      router.replace('/student/join');
      return;
    }
    (async () => {
      const [g, p] = await Promise.all([
        fetch(`/api/games/${gameId}`).then((r) => r.json()),
        fetch(`/api/players?gameId=${gameId}`).then((r) => r.json()),
      ]);
      if (g.success) setGame(g.data);
      if (p.success) setPlayers(p.data || []);
    })();
    (async () => {
      if (studentId) {
        const r = await fetch(`/api/students/${studentId}`).then((x) => x.json());
        if (r.success) setMe(r.data);
      }
    })();
  }, [gameId, studentId, router]);

  // รอครูเริ่มเกม
  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;
    const myPlayerId = sp.get('playerId') || '';
    const poll = async () => {
      try {
        const [s, p] = await Promise.all([
          fetch(`/api/sessions?gameId=${gameId}`).then((r) => r.json()),
          fetch(`/api/players?gameId=${gameId}`).then((r) => r.json()),
        ]);
        if (cancelled) return;
        if (p.success) setPlayers(p.data || []);
        const status = s.success && s.data ? s.data.status : 'lobby';
        if (status === 'question' || status === 'paused' || status === 'boss') {
          router.replace(`/student/game/${gameId}?playerId=${myPlayerId}&studentId=${studentId}`);
          return;
        }
        if (status === 'completed') {
          // ⚠️ รอบที่ปิดแล้ว ≠ รอบของฉันจบ
          //    ถ้าพาไปหน้าผลวิเคราะห์ทุกครั้งที่เห็น completed นักเรียนที่เพิ่งเข้ามา
          //    (หรือกลับมาเปลี่ยนชื่อ) จะโดนดันออกจากห้องรอทันทีทั้งที่ยังไม่ได้เล่น
          //    → ต้องเช็คก่อนว่าตัวเองอยู่ในรายชื่อของรอบนั้นจริงไหม
          const iPlayed = p.success && (p.data || []).some((x: any) => x.id === myPlayerId);
          if (iPlayed) {
            router.replace(`/student/me?studentId=${studentId}&gameId=${gameId}`);
          }
        }
      } catch {
        /* ไม่ critical */
      }
    };
    poll();
    const t = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [gameId, studentId, router, sp]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-lavender-50 to-mint-50 flex items-center justify-center p-4">
      <div className="fixed top-4 left-4 z-50">
        <HomeButton />
      </div>
      <div className="card w-full max-w-lg p-8 text-center">
        <div className="text-7xl mb-4 animate-bounce-soft">{MASCOT.emoji}</div>

        <div className="mb-6">
          <p className="text-quest-text/60 mb-2">Room Code</p>
          <div className="inline-block px-8 py-4 bg-gradient-to-r from-quest-sky to-quest-lavender rounded-3xl">
            <span className="text-4xl font-bold text-white tracking-widest">
              {game?.roomCode || '••••••'}
            </span>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-1">รอครูเริ่มเกม...</h2>
          <p className="text-quest-text/60">อยู่ในห้องรอ อย่าออกไปไหน!</p>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-quest-text/60">ผู้เล่น</span>
            <span className="font-bold">{players.length} คน</span>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {players.map((p) => (
              <div
                key={p.id}
                title={p.name}
                className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center text-2xl ${
                  p.studentId === studentId
                    ? 'bg-white border-quest-sky ring-2 ring-quest-sky'
                    : 'bg-white border-gray-100'
                }`}
              >
                {p.avatar}
              </div>
            ))}
            {players.length === 0 && (
              <p className="text-quest-text/60 text-sm py-4">ยังไม่มีใครเข้าร่วม</p>
            )}
          </div>
        </div>

        {me && (
          <div className="p-4 bg-sky-50 rounded-2xl flex items-center justify-center gap-3">
            <span className="text-3xl">{me.avatar}</span>
            <div className="text-left">
              <p className="font-medium">{me.name}</p>
              <p className="text-sm text-quest-text/60">
                {me.gamesPlayed > 0 ? `เล่นไปแล้ว ${me.gamesPlayed} ครั้ง` : 'มาเล่นครั้งแรก!'}
              </p>
            </div>
          </div>
        )}

        <Link
          href="/student/join"
          className="mt-6 inline-block text-quest-text/60 hover:text-quest-sky text-sm"
        >
          ← ออกจากห้อง
        </Link>
      </div>
    </div>
  );
}

export default function StudentLobbyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-lavender-50 to-mint-50 flex items-center justify-center">
          <div className="text-6xl animate-bounce">🦊</div>
        </div>
      }
    >
      <Lobby />
    </Suspense>
  );
}
