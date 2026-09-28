'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { MASCOT } from '@/lib/utils';

export default function StudentGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = use(params);
  const router = useRouter();
  const [game, setGame] = useState<any>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentMissionIndex, setCurrentMissionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [xp, setXp] = useState(0);
  const [bossHp, setBossHp] = useState(1000);
  const [isBossPhase, setIsBossPhase] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (gameId) {
      fetchGameData();
    }
  }, [gameId]);

  const fetchGameData = async () => {
    try {
      const [gameRes, missionsRes, sessionRes] = await Promise.all([
        fetch(`/api/games/${gameId}`),
        fetch(`/api/missions?gameId=${gameId}`),
        fetch(`/api/sessions?gameId=${gameId}`),
      ]);

      const gameData = await gameRes.json();
      const missionsData = await missionsRes.json();
      const sessionData = await sessionRes.json();

      if (gameData.success) setGame(gameData.data);
      if (missionsData.success) setMissions(missionsData.data);
      if (sessionData.success && sessionData.data) {
        setSession(sessionData.data);
        setCurrentMissionIndex(sessionData.data.currentMissionIndex);
        setBossHp(sessionData.data.bossHp);
      }

      // Create player
      const playerRes = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          nickname: 'Player' + Math.floor(Math.random() * 1000),
          avatar: '🦊',
        }),
      });
      const playerData = await playerRes.json();
      if (playerData.success) {
        setPlayer(playerData.data);
        setXp(playerData.data.xp);
      }
    } catch (err) {
      console.error('Failed to fetch game data:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentMission = missions[currentMissionIndex];

  const handleSubmit = async () => {
    if (selectedAnswer === null || !currentMission) return;
    const isCorrect = selectedAnswer === currentMission.questions[0]?.correctAnswer;
    setShowResult(true);
    if (isCorrect && player) {
      const newXp = xp + currentMission.xp;
      setXp(newXp);
      await fetch(`/api/players/${player.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xp: newXp }),
      });
    }
  };

  const handleNext = () => {
    setShowResult(false);
    setSelectedAnswer(null);
    if (currentMissionIndex < missions.length - 1) {
      const nextIndex = currentMissionIndex + 1;
      setCurrentMissionIndex(nextIndex);
      fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, currentMissionIndex: nextIndex }),
      });
    } else {
      setIsBossPhase(true);
    }
  };

  const handleBossAttack = async () => {
    if (selectedAnswer === null) return;
    const isCorrect = selectedAnswer === currentMission?.questions[0]?.correctAnswer;
    setShowResult(true);
    if (isCorrect) {
      const newBossHp = Math.max(0, bossHp - 100);
      setBossHp(newBossHp);
      const newXp = xp + 150;
      setXp(newXp);
      await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, bossHp: newBossHp }),
      });
      if (player) {
        await fetch(`/api/players/${player.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ xp: newXp }),
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">{MASCOT.emoji}</div>
          <p className="text-quest-text/60">กำลังโหลดเกม...</p>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😢</div>
          <h2 className="text-xl font-bold mb-2">ไม่พบเกม</h2>
          <p className="text-quest-text/60 mb-4">เกมนี้อาจถูกลบหรือไม่มีอยู่</p>
          <button onClick={() => router.push('/student/join')} className="btn-primary">กลับหน้าเข้าร่วม</button>
        </div>
      </div>
    );
  }

  if (isBossPhase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="card w-full max-w-md p-8 text-center">
          <div className="text-8xl mb-4 animate-bounce-soft">👹</div>
          <h2 className="text-2xl font-bold mb-2">{game.bossName}</h2>
          <p className="text-quest-text/60 mb-6">Boss Battle</p>
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Boss HP</span>
              <span className="text-sm text-quest-text/60">{bossHp} / {game.bossHp}</span>
            </div>
            <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all" style={{ width: `${(bossHp / game.bossHp) * 100}%` }} />
            </div>
          </div>
          {!showResult ? (
            <>
              <div className="mb-6">
                <p className="text-lg font-medium mb-4">{currentMission?.questions[0]?.text || 'คำถามสุดท้าย'}</p>
                <div className="space-y-3">
                  {(currentMission?.questions[0]?.options || ['A', 'B', 'C', 'D']).map((option: string, index: number) => (
                    <button key={index} onClick={() => setSelectedAnswer(index)} className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${selectedAnswer === index ? 'border-quest-sky bg-sky-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <span className="font-medium">{String.fromCharCode(65 + index)}.</span> {option}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleBossAttack} disabled={selectedAnswer === null} className="btn-primary w-full disabled:opacity-50">⚔️ โจมตี!</button>
            </>
          ) : (
            <div className="space-y-4">
              <div className={`text-6xl ${selectedAnswer === currentMission?.questions[0]?.correctAnswer ? 'animate-boss-hit' : ''}`}>
                {selectedAnswer === currentMission?.questions[0]?.correctAnswer ? '💥' : '❌'}
              </div>
              <h3 className={`text-xl font-bold ${selectedAnswer === currentMission?.questions[0]?.correctAnswer ? 'text-green-600' : 'text-red-500'}`}>
                {selectedAnswer === currentMission?.questions[0]?.correctAnswer ? 'CRITICAL HIT!' : 'MISS!'}
              </h3>
              {selectedAnswer === currentMission?.questions[0]?.correctAnswer && <p className="text-quest-text/60">-100 HP • +150 XP</p>}
              <button onClick={() => router.push(`/student/results?gameId=${gameId}`)} className="btn-primary w-full">
                {bossHp <= 0 ? 'ดูผลลัพธ์' : 'ถัดไป'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-purple-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{MASCOT.emoji}</span>
            <span className="font-medium">Mission {currentMissionIndex + 1}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-yellow-500">⭐</span>
            <span className="font-bold">{xp} XP</span>
          </div>
        </div>
        <div className="flex gap-2 mb-6">
          {missions.map((_, index) => (
            <div key={index} className={`flex-1 h-2 rounded-full ${index < currentMissionIndex ? 'bg-green-400' : index === currentMissionIndex ? 'bg-quest-sky' : 'bg-gray-200'}`} />
          ))}
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
        {!showResult ? (
          <>
            <div className="mb-6">
              <p className="text-lg font-medium mb-4">{currentMission?.questions[0]?.text || 'คำถาม'}</p>
              <div className="space-y-3">
                {(currentMission?.questions[0]?.options || ['A', 'B', 'C', 'D']).map((option: string, index: number) => (
                  <button key={index} onClick={() => setSelectedAnswer(index)} className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${selectedAnswer === index ? 'border-quest-sky bg-sky-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <span className="font-medium">{String.fromCharCode(65 + index)}.</span> {option}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleSubmit} disabled={selectedAnswer === null} className="btn-primary w-full disabled:opacity-50">ตอบ</button>
          </>
        ) : (
          <div className="text-center space-y-4">
            <div className="text-6xl">{selectedAnswer === currentMission?.questions[0]?.correctAnswer ? '✅' : '❌'}</div>
            <h3 className={`text-xl font-bold ${selectedAnswer === currentMission?.questions[0]?.correctAnswer ? 'text-green-600' : 'text-red-500'}`}>
              {selectedAnswer === currentMission?.questions[0]?.correctAnswer ? 'ถูกต้อง!' : 'ไม่ถูกต้อง'}
            </h3>
            {selectedAnswer === currentMission?.questions[0]?.correctAnswer && (
              <div className="inline-block px-4 py-2 bg-green-100 text-green-700 rounded-full font-bold animate-xp-popup">+{currentMission?.xp || 100} XP</div>
            )}
            {selectedAnswer !== currentMission?.questions[0]?.correctAnswer && currentMission?.questions[0]?.explanation && (
              <div className="p-4 bg-orange-50 rounded-2xl text-left">
                <p className="text-sm font-medium text-orange-700 mb-1">คำอธิบาย</p>
                <p className="text-sm text-orange-600">{currentMission.questions[0].explanation}</p>
              </div>
            )}
            <button onClick={handleNext} className="btn-primary w-full">ถัดไป</button>
          </div>
        )}
      </div>
    </div>
  );
}
