'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isTeacherLoggedIn } from '@/lib/auth';
import TeacherHeader from '@/components/TeacherHeader';

type Game = {
  id: string;
  name: string;
  subject?: string;
  topic?: string;
  description?: string;
  roomCode?: string;
  status: string;
  mode?: string;
  bossName?: string;
  bossHp?: number;
  createdAt?: string;
  players?: number;
  missions?: number;
};

const emptyForm = { name: '', subject: '', topic: '', description: '' };

export default function TeacherGamesPage() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');

  const [editing, setEditing] = useState<Game | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadGames = useCallback(async () => {
    try {
      const response = await fetch('/api/games');
      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      const list: Game[] = result.data || [];
      const withCounts = await Promise.all(
        list.map(async (game) => {
          const [playersRes, missionsRes] = await Promise.all([
            fetch(`/api/players?gameId=${game.id}`),
            fetch(`/api/missions?gameId=${game.id}`),
          ]);
          const players = await playersRes.json();
          const missions = await missionsRes.json();
          return {
            ...game,
            players: players.success ? players.data.length : 0,
            missions: missions.success ? missions.data.length : 0,
          };
        })
      );
      setGames(withCounts.reverse());
    } catch {
      setError('โหลดข้อมูลเกมไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isTeacherLoggedIn()) {
      router.replace('/teacher/login');
      return;
    }
    loadGames();
  }, [router, loadGames]);

  const openEdit = (game: Game) => {
    setEditing(game);
    setForm({
      name: game.name || '',
      subject: game.subject || '',
      topic: game.topic || '',
      description: game.description || '',
    });
    setError('');
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!form.name.trim()) {
      setError('กรอกชื่อเกม');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/games/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (result.success) {
        setEditing(null);
        loadGames();
      } else {
        setError(result.error || 'บันทึกไม่สำเร็จ');
      }
    } catch {
      setError('บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setSaving(false);
    }
  };

  const deleteGame = async (game: Game) => {
    if (
      !confirm(
        `ต้องการลบเกม "${game.name || 'ไม่มีชื่อ'}" หรือไม่?\nMission และผู้เล่นทั้งหมดจะถูกลบด้วย`
      )
    )
      return;
    try {
      const response = await fetch(`/api/games/${game.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) loadGames();
      else setError(result.error || 'ลบไม่สำเร็จ');
    } catch {
      setError('ลบไม่สำเร็จ ลองใหม่อีกครั้ง');
    }
  };

  const filtered = games.filter((game) => {
    if (!keyword.trim()) return true;
    const k = keyword.trim().toLowerCase();
    return (
      (game.name || '').toLowerCase().includes(k) ||
      (game.subject || '').toLowerCase().includes(k) ||
      (game.topic || '').toLowerCase().includes(k)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <TeacherHeader title="เกมของฉัน" subtitle={`${games.length} เกม`} backHref="/teacher/dashboard" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="ค้นหาเกม..."
            className="input flex-1"
          />
          <Link href="/teacher/create" className="btn-primary text-center">
            + สร้างเกมใหม่
          </Link>
        </div>

        {error && !editing && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl">{error}</div>
        )}

        {loading ? (
          <p className="text-center py-16 text-quest-text/60">กำลังโหลด...</p>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-5xl mb-4">📦</div>
            <h3 className="text-xl font-bold mb-1">
              {games.length === 0 ? 'ยังไม่มีเกม' : 'ไม่พบเกมที่ค้นหา'}
            </h3>
            <p className="text-quest-text/60 mb-6">
              {games.length === 0 ? 'เริ่มสร้างเกมแรกของคุณได้เลย' : 'ลองเปลี่ยนคำค้นหา'}
            </p>
            {games.length === 0 && (
              <Link href="/teacher/create" className="btn-primary">
                + สร้างเกม
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((game) => (
              <div key={game.id} className="card p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-quest-sky to-quest-lavender flex items-center justify-center text-2xl shrink-0">
                      🎮
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold truncate">{game.name || 'ไม่มีชื่อ'}</h3>
                      <p className="text-sm text-quest-text/60 truncate">
                        {game.subject || 'ไม่ระบุวิชา'}
                        {game.topic ? ` • ${game.topic}` : ''}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ${
                      (game.missions ?? 0) > 0
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {(game.missions ?? 0) > 0 ? 'พร้อมเล่น' : 'ยังไม่มีคำถาม'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-4 text-sm">
                  <span className="px-3 py-1 bg-sky-50 text-sky-700 rounded-full">
                    🔑 {game.roomCode || '-'}
                  </span>
                  <span className="px-3 py-1 bg-lavender-50 text-purple-700 rounded-full">
                    {game.mode === 'team' ? '👥 ทีม' : '🎯 เดี่ยว'}
                  </span>
                  <span className="px-3 py-1 bg-mint-50 text-emerald-700 rounded-full">
                    📝 {game.missions ?? 0} Mission
                  </span>
                  <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full">
                    👥 {game.players ?? 0} คน
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/teacher/missions?gameId=${game.id}`}
                    className="px-3 py-2 rounded-2xl bg-quest-sky text-white text-sm font-medium hover:opacity-90"
                  >
                    📝 จัดการคำถาม
                  </Link>
                  <Link
                    href={`/teacher/game/${game.id}`}
                    className="px-3 py-2 rounded-2xl bg-green-500 text-white text-sm font-medium hover:bg-green-600"
                  >
                    ▶️ เปิดห้องเล่น
                  </Link>
                  <button
                    onClick={() => openEdit(game)}
                    className="px-3 py-2 rounded-2xl bg-gray-100 hover:bg-gray-200 text-sm font-medium"
                  >
                    ✏️ แก้ไข
                  </button>
                  <button
                    onClick={() => deleteGame(game)}
                    className="px-3 py-2 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium"
                  >
                    🗑️ ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 overflow-y-auto">
          <div className="card w-full max-w-lg p-6 my-8">
            <h3 className="text-xl font-bold mb-4">แก้ไขเกม</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">ชื่อเกม</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">วิชา</label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">หัวข้อ</label>
                  <input
                    type="text"
                    value={form.topic}
                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">คำอธิบาย</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input resize-none"
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setEditing(null);
                  setError('');
                }}
                className="btn-secondary flex-1"
              >
                ยกเลิก
              </button>
              <button onClick={saveEdit} disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
