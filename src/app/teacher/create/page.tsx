'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MASCOT } from '@/lib/utils';

const STEPS = ['Game Info', 'Game Mode', 'Settings', 'Review'];

export default function CreateGamePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    topic: '',
    description: '',
    mode: 'solo' as 'solo' | 'team',
    teamCount: 2,
    timeLimit: 300,
    playerLimit: 40,
    randomEvents: false,
    actionCards: false,
    bossBattle: true,
    leaderboard: true,
    bossName: 'Monster',
    bossHp: 1000,
  });

  const updateForm = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, STEPS.length - 1));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 0));

  const handleCreateGame = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        router.push(`/teacher/game/${result.data.id}`);
      } else {
        setError(result.error || 'Failed to create game');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-quest-text/60 hover:text-quest-sky"
            >
              <span>←</span>
              <span>กลับ</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{MASCOT.emoji}</span>
              <span className="font-bold">Create Game</span>
            </div>
            <div className="w-16"></div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((label, index) => (
            <div key={index} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                index <= step ? 'bg-quest-sky text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {index + 1}
              </div>
              <span className={`ml-2 text-sm hidden sm:block ${index <= step ? 'text-quest-text' : 'text-gray-400'}`}>
                {label}
              </span>
              {index < STEPS.length - 1 && (
                <div className={`w-8 sm:w-16 h-0.5 mx-2 ${index < step ? 'bg-quest-sky' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="card p-6 sm:p-8">
          {/* Step 1: Game Info */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">ข้อมูลเกม</h2>
                <p className="text-quest-text/60">กรอกข้อมูลพื้นฐานของเกม</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">ชื่อเกม</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  placeholder="เช่น Memory Adventure"
                  className="input"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">วิชา</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => updateForm('subject', e.target.value)}
                    placeholder="เช่น Computer Science"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">หัวข้อ</label>
                  <input
                    type="text"
                    value={formData.topic}
                    onChange={(e) => updateForm('topic', e.target.value)}
                    placeholder="เช่น Memory Hierarchy"
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">คำอธิบาย</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                  placeholder="อธิบายเกมนี้..."
                  rows={3}
                  className="input resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 2: Game Mode */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">โหมดเกม</h2>
                <p className="text-quest-text/60">เลือกโหมดการเล่น</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => updateForm('mode', 'solo')}
                  className={`p-6 rounded-2xl border-2 text-left transition-all ${
                    formData.mode === 'solo' ? 'border-quest-sky bg-sky-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-4xl mb-3">🎮</div>
                  <h3 className="font-bold mb-1">Solo Mode</h3>
                  <p className="text-sm text-quest-text/60">เล่นคนเดียว สะสมคะแนนส่วนตัว</p>
                </button>
                <button
                  onClick={() => updateForm('mode', 'team')}
                  className={`p-6 rounded-2xl border-2 text-left transition-all ${
                    formData.mode === 'team' ? 'border-quest-sky bg-sky-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-4xl mb-3">👥</div>
                  <h3 className="font-bold mb-1">Team Mode</h3>
                  <p className="text-sm text-quest-text/60">เล่นเป็นทีม คะแนนรวม</p>
                </button>
              </div>
              {formData.mode === 'team' && (
                <div>
                  <label className="block text-sm font-medium mb-2">จำนวนทีม</label>
                  <div className="flex gap-3">
                    {[2, 3, 4].map((count) => (
                      <button
                        key={count}
                        onClick={() => updateForm('teamCount', count)}
                        className={`w-14 h-14 rounded-2xl font-bold text-lg transition-all ${
                          formData.teamCount === count ? 'bg-quest-sky text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">เวลา (นาที)</label>
                  <input
                    type="number"
                    value={formData.timeLimit / 60}
                    onChange={(e) => updateForm('timeLimit', parseInt(e.target.value) * 60)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">จำนวนผู้เล่นสูงสุด</label>
                  <input
                    type="number"
                    value={formData.playerLimit}
                    onChange={(e) => updateForm('playerLimit', parseInt(e.target.value))}
                    className="input"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Settings */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">ตั้งค่าเกม</h2>
                <p className="text-quest-text/60">เปิด/ปิดฟีเจอร์ต่างๆ</p>
              </div>
              <div className="space-y-4">
                {[
                  { key: 'randomEvents', label: 'Random Events', desc: 'เหตุการณ์สุ่มระหว่างเกม', icon: '🎲' },
                  { key: 'actionCards', label: 'Action Cards', desc: 'การ์ดพิเศษสำหรับผู้เล่น', icon: '🎴' },
                  { key: 'bossBattle', label: 'Boss Battle', desc: 'สู้กับ Boss ตอนท้ายเกม', icon: '👹' },
                  { key: 'leaderboard', label: 'Leaderboard', desc: 'แสดงอันดับคะแนน', icon: '🏆' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-quest-text/60">{item.desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => updateForm(item.key, !formData[item.key as keyof typeof formData])}
                      className={`w-14 h-8 rounded-full transition-all ${
                        formData[item.key as keyof typeof formData] ? 'bg-quest-sky' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${
                        formData[item.key as keyof typeof formData] ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
              {formData.bossBattle && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">ชื่อ Boss</label>
                    <input
                      type="text"
                      value={formData.bossName}
                      onChange={(e) => updateForm('bossName', e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Boss HP</label>
                    <input
                      type="number"
                      value={formData.bossHp}
                      onChange={(e) => updateForm('bossHp', parseInt(e.target.value))}
                      className="input"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">ตรวจสอบ</h2>
                <p className="text-quest-text/60">ตรวจสอบข้อมูลก่อนสร้างเกม</p>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="text-sm text-quest-text/60 mb-1">ชื่อเกม</p>
                  <p className="font-bold text-lg">{formData.name || 'ไม่ได้ตั้งชื่อ'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <p className="text-sm text-quest-text/60 mb-1">วิชา</p>
                    <p className="font-medium">{formData.subject || '-'}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <p className="text-sm text-quest-text/60 mb-1">โหมด</p>
                    <p className="font-medium">{formData.mode === 'solo' ? 'Solo' : 'Team'}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <p className="text-sm text-quest-text/60 mb-1">เวลา</p>
                    <p className="font-medium">{formData.timeLimit / 60} นาที</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <p className="text-sm text-quest-text/60 mb-1">ผู้เล่นสูงสุด</p>
                    <p className="font-medium">{formData.playerLimit} คน</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.randomEvents && <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">Random Events</span>}
                  {formData.actionCards && <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">Action Cards</span>}
                  {formData.bossBattle && <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">Boss Battle</span>}
                  {formData.leaderboard && <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">Leaderboard</span>}
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-2xl text-center">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={prevStep}
              disabled={step === 0}
              className="btn-secondary disabled:opacity-50"
            >
              ← กลับ
            </button>
            {step < STEPS.length - 1 ? (
              <button onClick={nextStep} className="btn-primary">
                ถัดไป →
              </button>
            ) : (
              <div className="flex gap-3">
                <button className="btn-secondary" disabled>
                  บันทึกฉบับร่าง
                </button>
                <button
                  onClick={handleCreateGame}
                  disabled={loading}
                  className="btn-primary disabled:opacity-50"
                >
                  {loading ? 'กำลังสร้าง...' : 'สร้างเกม'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
