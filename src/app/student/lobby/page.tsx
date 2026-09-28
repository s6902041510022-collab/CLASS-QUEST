'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MASCOT } from '@/lib/utils';

export default function StudentLobbyPage() {
  const searchParams = useSearchParams();
  const roomCode = searchParams.get('room') || 'XXXXXX';
  const nickname = searchParams.get('name') || 'Player';
  const avatar = searchParams.get('avatar') || '🦊';

  const players = [
    { name: 'Alice', avatar: '🦊' },
    { name: 'Bank', avatar: '🐱' },
    { name: 'Mint', avatar: '🐰' },
    { name: 'Tom', avatar: '🐻' },
    { name: nickname, avatar },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-lavender-50 to-mint-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-lg p-8 text-center">
        {/* Mascot */}
        <div className="text-7xl mb-4 animate-bounce-soft">{MASCOT.emoji}</div>

        {/* Room Code */}
        <div className="mb-8">
          <p className="text-quest-text/60 mb-2">Room Code</p>
          <div className="inline-block px-8 py-4 bg-gradient-to-r from-quest-sky to-quest-lavender rounded-3xl">
            <span className="text-4xl font-bold text-white tracking-widest">{roomCode}</span>
          </div>
        </div>

        {/* Waiting Message */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">รอครูเริ่มเกม...</h2>
          <p className="text-quest-text/60">อยู่ในห้องรอ อย่าออกไปไหน!</p>
        </div>

        {/* Players */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-quest-text/60">ผู้เล่น</span>
            <span className="font-bold">{players.length} / 40</span>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {players.map((player, index) => (
              <div
                key={index}
                className="w-14 h-14 rounded-2xl bg-white border-2 border-gray-100 flex items-center justify-center text-2xl shadow-soft"
              >
                {player.avatar}
              </div>
            ))}
            {Array.from({ length: Math.max(0, 8 - players.length) }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className="w-14 h-14 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300"
              >
                ?
              </div>
            ))}
          </div>
        </div>

        {/* Your Info */}
        <div className="p-4 bg-sky-50 rounded-2xl">
          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl">{avatar}</span>
            <div className="text-left">
              <p className="font-medium">{nickname}</p>
              <p className="text-sm text-quest-text/60">พร้อมเล่น!</p>
            </div>
          </div>
        </div>

        {/* Back */}
        <div className="mt-6">
          <Link href="/student/join" className="text-quest-text/60 hover:text-quest-sky">
            ← ออกจากห้อง
          </Link>
        </div>
      </div>
    </div>
  );
}
