'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MASCOT } from '@/lib/utils';

export default function StudentResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = searchParams.get('gameId') || '902d8aee-b7d9-42f0-b892-a8b11c5e56b7';
  const [player, setPlayer] = useState<any>(null);
  const [game, setGame] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, [gameId]);

  const fetchResults = async () => {
    try {
      const [gameRes, playersRes] = await Promise.all([
        fetch(`/api/games/${gameId}`),
        fetch(`/api/players?gameId=${gameId}`),
      ]);
      const gameData = await gameRes.json();
      const playersData = await playersRes.json();
      if (gameData.success) setGame(gameData.data);
      if (playersData.success) {
        setPlayers(playersData.data);
        const currentPlayer = playersData.data[playersData.data.length - 1];
        setPlayer(currentPlayer);
      }
    } catch (err) {
      console.error('Failed to fetch results:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-purple-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">{MASCOT.emoji}</div>
          <p className="text-quest-text/60">กำลังโหลดผลลัพธ์...</p>
        </div>
      </div>
    );
  }

  const xp = player?.xp || 920;
  const accuracy = player?.totalAnswers ? Math.round((player.correctAnswers / player.totalAnswers) * 100) : 86;
  const leaderboard = [...players].sort((a, b) => b.xp - a.xp).slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-purple-50 to-green-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="text-7xl mb-4 animate-bounce-soft">🎉</div>
          <h1 className="text-3xl font-bold mb-2">QUEST COMPLETE!</h1>
          <p className="text-quest-text/60">ยินดีด้วย! คุณผ่านภารกิจแล้ว</p>
        </div>
        <div className="card p-6 mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><p className="text-3xl font-bold text-quest-sky">{xp}</p><p className="text-sm text-quest-text/60">XP</p></div>
            <div><p className="text-3xl font-bold text-green-500">{accuracy}%</p><p className="text-sm text-quest-text/60">ความแม่นยำ</p></div>
            <div><p className="text-3xl font-bold text-purple-500">5/5</p><p className="text-sm text-quest-text/60">Missions</p></div>
          </div>
        </div>
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">🏆 Achievements</h2>
          <div className="space-y-3">
            {[{ icon: '🧠', name: 'Knowledge Master', desc: 'ตอบถูกมากที่สุd' }, { icon: '🤝', name: 'Team Hero', desc: 'ช่วยทีมมากที่สุด' }].map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-2xl">
                <span className="text-3xl">{a.icon}</span>
                <div><p className="font-medium">{a.name}</p><p className="text-sm text-quest-text/60">{a.desc}</p></div>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">🏆 Leaderboard</h2>
          <div className="space-y-2">
            {leaderboard.map((p, index) => (
              <div key={index} className={`flex items-center justify-between p-3 rounded-2xl ${p.id === player?.id ? 'bg-sky-50 border-2 border-quest-sky' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}</span>
                  <span className="text-2xl">{p.avatar}</span>
                  <span className="font-medium">{p.nickname}</span>
                </div>
                <span className="font-bold">{p.xp} XP</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push('/student/join')} className="btn-secondary flex-1 text-center">เล่นอีกครั้ง</button>
          <button onClick={() => router.push('/')} className="btn-primary flex-1 text-center">กลับหน้าแรก</button>
        </div>
      </div>
    </div>
  );
}
