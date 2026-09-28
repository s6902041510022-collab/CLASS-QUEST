'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MASCOT } from '@/lib/utils';

export default function LiveGameControlPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = use(params);
  const router = useRouter();
  const [game, setGame] = useState<any>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [gameStatus, setGameStatus] = useState<'lobby' | 'active' | 'paused' | 'completed'>('lobby');
  const [currentMission, setCurrentMission] = useState(0);
  const [bossHp, setBossHp] = useState(1000);
  const [showEventModal, setShowEventModal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (gameId) {
      fetchGameData();
    }
  }, [gameId]);

  const fetchGameData = async () => {
    try {
      const [gameRes, missionsRes, playersRes, sessionRes] = await Promise.all([
        fetch(`/api/games/${gameId}`),
        fetch(`/api/missions?gameId=${gameId}`),
        fetch(`/api/players?gameId=${gameId}`),
        fetch(`/api/sessions?gameId=${gameId}`),
      ]);

      const gameData = await gameRes.json();
      const missionsData = await missionsRes.json();
      const playersData = await playersRes.json();
      const sessionData = await sessionRes.json();

      if (gameData.success) setGame(gameData.data);
      if (missionsData.success) setMissions(missionsData.data);
      if (playersData.success) setPlayers(playersData.data);
      if (sessionData.success && sessionData.data) {
        setSession(sessionData.data);
        setGameStatus(sessionData.data.status);
        setBossHp(sessionData.data.bossHp);
        setCurrentMission(sessionData.data.currentMissionIndex);
      }
    } catch (err) {
      console.error('Failed to fetch game data:', err);
    } finally {
      setLoading(false);
    }
  };

  const startGame = async () => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });
      const result = await response.json();
      if (result.success) {
        setSession(result.data);
        setGameStatus('active');
      }
    } catch (err) {
      setError('Failed to start game');
    }
  };

  const pauseGame = async () => {
    try {
      await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, status: 'paused' }),
      });
      setGameStatus('paused');
    } catch (err) {
      setError('Failed to pause game');
    }
  };

  const resumeGame = async () => {
    try {
      await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, status: 'active' }),
      });
      setGameStatus('active');
    } catch (err) {
      setError('Failed to resume game');
    }
  };

  const skipMission = async () => {
    const nextIndex = currentMission + 1;
    try {
      await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, currentMissionIndex: nextIndex }),
      });
      setCurrentMission(nextIndex);
    } catch (err) {
      setError('Failed to skip mission');
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😢</div>
          <h2 className="text-xl font-bold mb-2">ไม่พบเกม</h2>
          <p className="text-quest-text/60 mb-4">เกมนี้อาจถูกลบหรือไม่มีอยู่</p>
          <button onClick={() => router.push('/teacher/dashboard')} className="btn-primary">
            กลับหน้า Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/teacher/dashboard')}
                className="text-quest-text/60 hover:text-quest-sky"
              >
                ← กลับ
              </button>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{MASCOT.emoji}</span>
                <div>
                  <h1 className="font-bold">{game.name}</h1>
                  <p className="text-sm text-quest-text/60">Room: {game.roomCode}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                gameStatus === 'active' ? 'bg-green-100 text-green-700' :
                gameStatus === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                gameStatus === 'lobby' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {gameStatus === 'active' ? 'LIVE' :
                 gameStatus === 'paused' ? 'PAUSED' :
                 gameStatus === 'lobby' ? 'LOBBY' : 'ENDED'}
              </span>
              <span className="text-quest-text/60">👥 {players.length}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-2xl">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Game Status */}
            <div className="card p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-2xl">
                  <p className="text-2xl font-bold">{currentMission + 1} / {missions.length || 5}</p>
                  <p className="text-sm text-quest-text/60">Mission</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-2xl">
                  <p className="text-2xl font-bold">{bossHp} / {game.bossHp}</p>
                  <p className="text-sm text-quest-text/60">Boss HP</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-2xl">
                  <p className="text-2xl font-bold">05:32</p>
                  <p className="text-sm text-quest-text/60">เวลา</p>
                </div>
              </div>

              {game.bossBattle && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">👹 {game.bossName}</span>
                    <span className="text-sm text-quest-text/60">{bossHp} / {game.bossHp}</span>
                  </div>
                  <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all"
                      style={{ width: `${(bossHp / game.bossHp) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {gameStatus === 'lobby' ? (
                  <button onClick={startGame} className="col-span-2 sm:col-span-4 p-4 rounded-2xl bg-green-500 text-white font-bold text-lg hover:bg-green-600 transition-all">
                    🚀 เริ่มเกม
                  </button>
                ) : (
                  <>
                    {gameStatus === 'active' ? (
                      <button onClick={pauseGame} className="p-3 rounded-2xl bg-yellow-100 text-yellow-700 hover:bg-yellow-200 font-medium transition-all">⏸️ หยุด</button>
                    ) : gameStatus === 'paused' ? (
                      <button onClick={resumeGame} className="p-3 rounded-2xl bg-green-100 text-green-700 hover:bg-green-200 font-medium transition-all">▶️ เล่นต่อ</button>
                    ) : null}
                    <button onClick={skipMission} className="p-3 rounded-2xl bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-all">⏭️ ข้าม</button>
                    <button className="p-3 rounded-2xl bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-all">⏰ +เวลา</button>
                    <button onClick={() => setShowEventModal(true)} className="p-3 rounded-2xl bg-purple-100 text-purple-700 hover:bg-purple-200 font-medium transition-all">🎲 Event</button>
                  </>
                )}
              </div>
            </div>

            {/* Missions */}
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4">Missions</h2>
              <div className="space-y-3">
                {missions.length === 0 ? (
                  <div className="text-center py-8 text-quest-text/60">
                    <p>ยังไม่มี Mission</p>
                    <Link href={`/teacher/missions?gameId=${gameId}`} className="text-quest-sky hover:underline">ไปสร้าง Mission →</Link>
                  </div>
                ) : (
                  missions.map((mission: any, index: number) => (
                    <div key={mission.id} className={`flex items-center justify-between p-4 rounded-2xl ${
                      index === currentMission && gameStatus === 'active' ? 'bg-sky-50 border-2 border-quest-sky' :
                      index < currentMission ? 'bg-green-50' : 'bg-gray-50'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                          index < currentMission ? 'bg-green-500 text-white' :
                          index === currentMission && gameStatus === 'active' ? 'bg-quest-sky text-white' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {index < currentMission ? '✓' : index + 1}
                        </div>
                        <span className="font-medium">{mission.title}</span>
                      </div>
                      {index === currentMission && gameStatus === 'active' && (
                        <span className="text-sm text-quest-sky font-medium">กำลังเล่น</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4">ผู้เล่น ({players.length})</h2>
              {players.length === 0 ? (
                <p className="text-quest-text/60 text-center py-4">ยังไม่มีผู้เล่น</p>
              ) : (
                <div className="space-y-3">
                  {players.map((player: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{player.avatar}</span>
                        <span className="font-medium">{player.nickname}</span>
                      </div>
                      <span className="font-bold">{player.xp} XP</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="card w-full max-w-md p-6 text-center">
            <div className="text-6xl mb-4">🎲</div>
            <h3 className="text-xl font-bold mb-2">Random Event</h3>
            <p className="text-quest-text/60 mb-6">เลือก Event ที่ต้องการเกิดขึ้น</p>
            <div className="space-y-3">
              {[
                { icon: '🎁', name: 'Lucky Drop', desc: 'ผู้เล่นสุ่มได้รับ XP' },
                { icon: '⚡', name: 'Power Boost', desc: 'Mission ถัดไปได้ XP เพิ่ม' },
                { icon: '🌪️', name: 'Chaos Event', desc: 'ทุกคนต้องทำ Challenge' },
              ].map((event, index) => (
                <button key={index} onClick={() => setShowEventModal(false)} className="w-full p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 text-left transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{event.icon}</span>
                    <div>
                      <p className="font-medium">{event.name}</p>
                      <p className="text-sm text-quest-text/60">{event.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowEventModal(false)} className="btn-secondary w-full mt-4">ยกเลิก</button>
          </div>
        </div>
      )}
    </div>
  );
}
