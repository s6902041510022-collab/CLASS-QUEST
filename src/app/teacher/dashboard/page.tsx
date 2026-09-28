'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MASCOT } from '@/lib/utils';

export default function TeacherDashboardPage() {
  const [games] = useState([
    { id: '1', name: 'Memory Adventure', subject: 'Computer Science', status: 'active', players: 32 },
    { id: '2', name: 'Math Quest', subject: 'Mathematics', status: 'draft', players: 0 },
    { id: '3', name: 'Science Explorer', subject: 'Science', status: 'completed', players: 28 },
  ]);

  const stats = [
    { label: 'นักเรียนทั้งหมด', value: '32', icon: '👥', color: 'bg-sky-100' },
    { label: 'เกมที่กำลังเล่น', value: '2', icon: '🎮', color: 'bg-lavender-100' },
    { label: 'คะแนนเฉลี่ย', value: '86%', icon: '⭐', color: 'bg-mint-100' },
    { label: 'เกมที่จบแล้ว', value: '12', icon: '🏆', color: 'bg-orange-100' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{MASCOT.emoji}</span>
              <div>
                <h1 className="text-xl font-bold">CLASS QUEST</h1>
                <p className="text-sm text-quest-text/60">Teacher Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-2xl">👨‍🏫</span>
              <div className="text-right">
                <p className="font-medium">ครูสมชาย</p>
                <p className="text-sm text-quest-text/60">Game Master</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">สวัสดี, ครูสมชาย! 👋</h2>
          <p className="text-quest-text/60">พร้อมสร้างเกมการเรียนรู้แล้วหรือยัง?</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="card p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl ${stat.color} flex items-center justify-center text-2xl`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-quest-text/60">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/teacher/create" className="card card-hover p-6 text-center">
            <div className="text-4xl mb-3">➕</div>
            <h3 className="font-bold mb-1">สร้างเกมใหม่</h3>
            <p className="text-sm text-quest-text/60">สร้างเกมการเรียนรู้</p>
          </Link>
          <Link href="/teacher/games" className="card card-hover p-6 text-center">
            <div className="text-4xl mb-3">🎮</div>
            <h3 className="font-bold mb-1">เริ่มเกม</h3>
            <p className="text-sm text-quest-text/60">เริ่มเกมที่สร้างไว้</p>
          </Link>
          <Link href="/teacher/analytics" className="card card-hover p-6 text-center">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="font-bold mb-1">ดู Analytics</h3>
            <p className="text-sm text-quest-text/60">วิเคราะห์การเรียนรู้</p>
          </Link>
        </div>

        {/* Recent Games */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">เกมล่าสุด</h3>
            <Link href="/teacher/games" className="text-quest-sky hover:underline text-sm">
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="space-y-4">
            {games.map((game) => (
              <div key={game.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-quest-sky to-quest-lavender flex items-center justify-center text-2xl">
                    🎮
                  </div>
                  <div>
                    <h4 className="font-medium">{game.name}</h4>
                    <p className="text-sm text-quest-text/60">{game.subject}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    game.status === 'active' ? 'bg-green-100 text-green-700' :
                    game.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {game.status === 'active' ? 'กำลังเล่น' :
                     game.status === 'draft' ? 'ฉบับร่าง' : 'จบแล้ว'}
                  </span>
                  <span className="text-sm text-quest-text/60">
                    👥 {game.players}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
