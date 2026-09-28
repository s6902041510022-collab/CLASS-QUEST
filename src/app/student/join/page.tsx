'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MASCOT, getRandomAvatar } from '@/lib/utils';
import { getStudentSession, setStudentSession } from '@/lib/auth';

const AVATARS = ['🦊', '🐱', '🐶', '🐰', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸', '🐵', '🐔'];

export default function StudentJoinPage() {
  const [roomCode, setRoomCode] = useState('');
  const [game, setGame] = useState<any>(null);
  const [roster, setRoster] = useState<any[]>([]);
  const [me, setMe] = useState<{ studentId: string; name: string; avatar: string } | null>(null);
  const [showPick, setShowPick] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState(getRandomAvatar());
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const s = getStudentSession();
    if (s) setMe(s);
  }, []);

  useEffect(() => {
    if (!game) return;
    (async () => {
      try {
        const r = await fetch('/api/students');
        const j = await r.json();
        if (j.success) setRoster(j.data || []);
      } catch {
        /* ไม่ critical */
      }
    })();
  }, [game]);

  const checkRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.length !== 6) {
      setError('Room Code ต้องมี 6 ตัวอักษร');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await fetch(`/api/rooms?code=${roomCode}`);
      const j = await r.json();
      if (j.success && j.data) setGame(j.data);
      else setError('ไม่พบห้องนี้ ลองเช็ก Room Code อีกครั้ง');
    } catch {
      setError('เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setBusy(false);
    }
  };

  const join = async (studentId: string) => {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: game.id, studentId }),
      });
      const j = await r.json();
      if (!j.success) {
        setError(j.error || 'เข้าร่วมไม่สำเร็จ');
        return;
      }
      const s = roster.find((x: any) => x.id === studentId);
      setStudentSession(studentId, s?.name || me?.name || '', s?.avatar || me?.avatar || '🦊');
      router.push(
        `/student/lobby?gameId=${game.id}&playerId=${j.data.id}&studentId=${studentId}`
      );
    } catch {
      setError('เข้าร่วมไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setBusy(false);
    }
  };

  // นักเรียนใหม่ที่ไม่อยู่ในรายชื่อ → เพิ่มเข้ารายชื่อให้อัตโนมัติ
  const joinAsNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setError('กรอกชื่อเล่นด้วยครับ');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), avatar: newAvatar }),
      });
      const j = await r.json();
      if (!j.success) {
        setError(j.error || 'เข้าร่วมไม่สำเร็จ');
        return;
      }
      setRoster((prev) =>
        prev.some((p) => p.id === j.data.id) ? prev : [...prev, j.data]
      );
      setMe({ studentId: j.data.id, name: j.data.name, avatar: j.data.avatar });
      setNewName('');
      setShowPick(false);
      await join(j.data.id);
    } catch {
      setError('เข้าร่วมไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setBusy(false);
    }
  };

  const filtered = roster.filter((s) =>
    search ? s.name.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-lavender-50 to-mint-50 flex items-center justify-center p-4">
      <div className="fixed top-4 left-4 z-50">
        <Link href="/student/join" title="กลับหน้าหลัก" className="text-2xl text-quest-text/60 hover:text-quest-sky transition-colors">
          🏠
        </Link>
      </div>
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4 animate-float">{MASCOT.emoji}</div>
          <h1 className="text-2xl font-bold mb-1">
            {game ? game.name || 'เข้าร่วมเกม' : 'เข้าร่วมเกม'}
          </h1>
          <p className="text-quest-text/60 text-sm">
            {game ? 'เลือกชื่อของคุณเพื่อเข้าเล่น' : 'กรอก Room Code จากครู'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        {!game ? (
          <form onSubmit={checkRoom} className="space-y-6">
            <input
              type="text"
              maxLength={6}
              value={roomCode}
              onChange={(e) => {
                setRoomCode(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="ROOM CODE"
              className="input text-center text-3xl tracking-[0.4em] uppercase"
              autoFocus
            />
            <button
              type="submit"
              disabled={roomCode.length !== 6 || busy}
              className="btn-primary w-full disabled:opacity-50"
            >
              {busy ? 'กำลังตรวจสอบ...' : 'ถัดไป'}
            </button>
          </form>
        ) : me && !showPick ? (
          <div className="space-y-3">
            <button
              onClick={() => join(me!.studentId)}
              disabled={busy}
              className="w-full p-4 rounded-2xl bg-sky-50 border-2 border-quest-sky flex items-center gap-3 hover:bg-sky-100 transition-colors disabled:opacity-50"
            >
              <span className="text-3xl">{me!.avatar}</span>
              <div className="text-left flex-1 min-w-0">
                <p className="font-bold truncate">{me!.name}</p>
                <p className="text-xs text-quest-text/60">กดเพื่อเข้าเล่นเป็นชื่อนี้</p>
              </div>
              <span className="text-quest-text/40">›</span>
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowPick(true)} className="btn-secondary">
                เปลี่ยนคนเล่น
              </button>
              <Link
                href={`/student/me?studentId=${me!.studentId}`}
                className="btn-secondary text-center"
              >
                ผลของฉัน
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อของคุณ..."
              className="input"
              autoFocus
            />

            <div className="max-h-64 overflow-y-auto space-y-2">
              {filtered.length === 0 ? (
                <p className="text-center text-quest-text/60 text-sm py-6">
                  ไม่พบชื่อที่ค้นหา
                </p>
              ) : (
                filtered.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => join(s.id)}
                    disabled={busy}
                    className="w-full p-3 rounded-2xl bg-gray-50 hover:bg-sky-50 flex items-center gap-3 transition-colors disabled:opacity-50"
                  >
                    <span className="text-2xl">{s.avatar}</span>
                    <span className="font-medium flex-1 text-left truncate">{s.name}</span>
                    {s.id === me?.studentId && (
                      <span className="text-xs text-quest-sky font-medium">คุณ</span>
                    )}
                  </button>
                ))
              )}
            </div>

            <form onSubmit={joinAsNew} className="pt-2 border-t border-gray-100 space-y-3">
              <p className="text-xs text-quest-text/60 text-center">
                ไม่เจอชื่อของคุณ? เพิ่มชื่อใหม่
              </p>
              <input
                type="text"
                maxLength={20}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="ชื่อของคุณ"
                className="input"
              />
              <div className="grid grid-cols-6 gap-2">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setNewAvatar(a)}
                    className={`w-11 h-11 rounded-xl text-xl flex items-center justify-center ${
                      newAvatar === a ? 'bg-quest-sky ring-2 ring-quest-sky' : 'bg-gray-100'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPick(false)}
                  className="btn-secondary flex-1"
                >
                  ← กลับ
                </button>
                <button
                  type="submit"
                  disabled={!newName.trim() || busy}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {busy ? 'กำลังเข้า...' : 'เข้าเล่น'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/" className="text-quest-text/60 hover:text-quest-sky text-sm">
            ← กลับหน้าแรก
          </Link>
        </div>
      </div>
    </div>
  );
}
