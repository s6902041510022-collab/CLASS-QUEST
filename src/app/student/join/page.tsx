'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MASCOT, getRandomAvatar } from '@/lib/utils';

export default function StudentJoinPage() {
  const [roomCode, setRoomCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState(getRandomAvatar());
  const [step, setStep] = useState<'code' | 'nickname'>('code');
  const router = useRouter();

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.length === 6) {
      setStep('nickname');
    }
  };

  const handleNicknameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim()) {
      // In production, validate room code and create player
      router.push(`/student/lobby?room=${roomCode}&name=${encodeURIComponent(nickname)}&avatar=${avatar}`);
    }
  };

  const avatars = ['🦊', '🐱', '🐶', '🐰', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸', '🐵', '🐔'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-lavender-50 to-mint-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-float">{MASCOT.emoji}</div>
          <h1 className="text-2xl font-bold mb-2">เข้าร่วมเกม</h1>
          <p className="text-quest-text/60">
            {step === 'code' ? 'กรอก Room Code จากครู' : 'ตั้งชื่อและเลือก Avatar'}
          </p>
        </div>

        {/* Step 1: Room Code */}
        {step === 'code' && (
          <form onSubmit={handleCodeSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Room Code</label>
              <input
                type="text"
                maxLength={6}
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="XXXXXX"
                className="input text-center text-3xl tracking-[0.5em] uppercase"
                autoFocus
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={roomCode.length !== 6}>
              เข้าร่วม
            </button>
          </form>
        )}

        {/* Step 2: Nickname & Avatar */}
        {step === 'nickname' && (
          <form onSubmit={handleNicknameSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">ชื่อเล่น</label>
              <input
                type="text"
                maxLength={20}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="ใส่ชื่อเล่นของคุณ"
                className="input"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">เลือก Avatar</label>
              <div className="grid grid-cols-6 gap-2">
                {avatars.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAvatar(a)}
                    className={`w-12 h-12 rounded-2xl text-2xl flex items-center justify-center transition-all ${
                      avatar === a ? 'bg-quest-sky ring-2 ring-quest-sky scale-110' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('code')}
                className="btn-secondary flex-1"
              >
                ← กลับ
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={!nickname.trim()}>
                เข้าร่วม
              </button>
            </div>
          </form>
        )}

        {/* Back */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-quest-text/60 hover:text-quest-sky">
            ← กลับหน้าแรก
          </Link>
        </div>
      </div>
    </div>
  );
}
