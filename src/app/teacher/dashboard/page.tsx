'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MASCOT } from '@/lib/utils';
import { isTeacherLoggedIn, getTeacherSession } from '@/lib/auth';
import TeacherHeader from '@/components/TeacherHeader';

type Game = {
  id: string;
  name: string;
  subject?: string;
  topic?: string;
  roomCode?: string;
  status: string;
  mode?: string;
  createdAt?: string;
  players?: number;
  missions?: number;
};

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // อ่านชื่อครูหลัง mount เท่านั้น ถ้าอ่านตอน render เซิร์ฟเวอร์จะได้ 'ครู'
  // แต่ client ได้ 'ครูกิตติ' → เกิด hydration mismatch แล้วหน้ากะพริบวาดใหม่ทั้งหน้า
  const [teacherName, setTeacherName] = useState('');

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
    } catch (err) {
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
    setTeacherName(getTeacherSession()?.name || '');
    loadGames();
  }, [router, loadGames]);

  const totalPlayers = games.reduce((sum, g) => sum + (g.players || 0), 0);
  const totalMissions = games.reduce((sum, g) => sum + (g.missions || 0), 0);
  const readyGames = games.filter((g) => (g.missions || 0) > 0).length;

  const stats = [
    { label: 'เกมทั้งหมด', value: games.length, icon: '🎮', color: 'bg-sky-100' },
    { label: 'Mission ทั้งหมด', value: totalMissions, icon: '📝', color: 'bg-lavender-100' },
    { label: 'พร้อมเล่น', value: readyGames, icon: '✅', color: 'bg-mint-100' },
    { label: 'ผู้เล่นทั้งหมด', value: totalPlayers, icon: '👥', color: 'bg-orange-100' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <TeacherHeader title="CLASS QUEST" subtitle="Teacher Dashboard" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">
            สวัสดี, {teacherName || 'ครู'}! 👋
          </h2>
          <p className="text-quest-text/60">{MASCOT.name} พร้อมช่วยคุณสร้างเกมการเรียนรู้แล้วนะ</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl flex items-center justify-between gap-3">
            <span>{error}</span>
            <button onClick={loadGames} className="px-3 py-1 bg-red-100 rounded-xl text-sm font-medium">
              ลองใหม่
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="card p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl ${stat.color} flex items-center justify-center text-2xl shrink-0`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-quest-text/60">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <Link href="/teacher/create" className="card card-hover p-6 text-center">
            <div className="text-4xl mb-3">➕</div>
            <h3 className="font-bold mb-1">สร้างเกมใหม่</h3>
            <p className="text-sm text-quest-text/60">สร้างเกมการเรียนรู้</p>
          </Link>
          <Link href="/teacher/games" className="card card-hover p-6 text-center">
            <div className="text-4xl mb-3">🎮</div>
            <h3 className="font-bold mb-1">เกมของฉัน</h3>
            <p className="text-sm text-quest-text/60">แก้ไข และเริ่มเล่น</p>
          </Link>
          <Link href="/teacher/analytics" className="card card-hover p-6 text-center">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="font-bold mb-1">ผลการวิเคราะห์</h3>
            <p className="text-sm text-quest-text/60">ดูว่าใครตอบถูกกี่ข้อ</p>
          </Link>
          <Link href="/teacher/students" className="card card-hover p-6 text-center">
            <div className="text-4xl mb-3">👥</div>
            <h3 className="font-bold mb-1">รายชื่อนักเรียน</h3>
            <p className="text-sm text-quest-text/60">ให้เด็กกดชื่อตัวเอง</p>
          </Link>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-6 gap-3">
            <h3 className="text-lg font-bold">เกมล่าสุด</h3>
            <Link href="/teacher/games" className="text-quest-sky hover:underline text-sm shrink-0">
              ดูทั้งหมด →
            </Link>
          </div>

          {loading ? (
            <p className="text-center py-8 text-quest-text/60">กำลังโหลด...</p>
          ) : games.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📦</div>
              <h4 className="font-bold mb-1">ยังไม่มีเกม</h4>
              <p className="text-quest-text/60 mb-6">เริ่มสร้างเกมแรกของคุณได้เลย</p>
              <Link href="/teacher/create" className="btn-primary">
                + สร้างเกม
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {games.slice(0, 5).map((game) => (
                <Link
                  key={game.id}
                  href={`/teacher/games?gameId=${game.id}`}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors gap-3"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-quest-sky to-quest-lavender flex items-center justify-center text-2xl shrink-0">
                      🎮
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-medium truncate">{game.name || 'ไม่มีชื่อ'}</h4>
                      <p className="text-sm text-quest-text/60 truncate">
                        {game.subject || 'ไม่ระบุวิชา'}
                        {game.topic ? ` • ${game.topic}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-sm text-quest-text/60">
                    <span>📝 {game.missions ?? 0}</span>
                    <span>👥 {game.players ?? 0}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
