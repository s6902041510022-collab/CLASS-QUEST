'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MASCOT } from '@/lib/utils';

interface Mission {
  id: string;
  order: number;
  title: string;
  type: string;
  xp: number;
  questions: any[];
}

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export default function MissionBuilderPage() {
  const router = useRouter();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // New mission form
  const [newMission, setNewMission] = useState({
    title: '',
    type: 'quiz',
    xp: 100,
    questions: [] as Question[],
  });

  // New question form
  const [newQuestion, setNewQuestion] = useState({
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
  });

  const gameId = '902d8aee-b7d9-42f0-b892-a8b11c5e56b7'; // Demo game ID

  useEffect(() => {
    fetchMissions();
  }, []);

  const fetchMissions = async () => {
    try {
      const response = await fetch(`/api/missions?gameId=${gameId}`);
      const result = await response.json();
      if (result.success) {
        setMissions(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch missions:', err);
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    if (!newQuestion.text || newQuestion.options.some(o => !o)) {
      setError('กรุณากรอกคำถามและตัวเลือกให้ครบ');
      return;
    }
    const question: Question = {
      id: Date.now().toString(),
      ...newQuestion,
    };
    setNewMission(prev => ({
      ...prev,
      questions: [...prev.questions, question],
    }));
    setNewQuestion({
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
    });
    setError('');
  };

  const removeQuestion = (id: string) => {
    setNewMission(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== id),
    }));
  };

  const handleSaveMission = async () => {
    if (!newMission.title) {
      setError('กรุณากรอกชื่อ Mission');
      return;
    }
    if (newMission.questions.length === 0) {
      setError('กรุณาเพิ่มคำถามอย่างน้อย 1 ข้อ');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          title: newMission.title,
          type: newMission.type,
          xp: newMission.xp,
          questions: newMission.questions,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setShowAddModal(false);
        setNewMission({
          title: '',
          type: 'quiz',
          xp: 100,
          questions: [],
        });
        fetchMissions();
      } else {
        setError(result.error || 'Failed to save mission');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteMission = async (id: string) => {
    if (!confirm('ต้องการลบ Mission นี้?')) return;

    try {
      const response = await fetch(`/api/missions/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        fetchMissions();
      }
    } catch (err) {
      console.error('Failed to delete mission:', err);
    }
  };

  const missionTypes = [
    { value: 'quiz', label: 'Quiz', icon: '❓' },
    { value: 'matching', label: 'Matching', icon: '🧩' },
    { value: 'sorting', label: 'Sorting', icon: '📊' },
    { value: 'drag-drop', label: 'Drag & Drop', icon: '🖱️' },
    { value: 'scenario', label: 'Scenario', icon: '📖' },
    { value: 'decision', label: 'Decision', icon: '🤔' },
    { value: 'speed', label: 'Speed Challenge', icon: '⚡' },
    { value: 'memory', label: 'Memory', icon: '🧠' },
    { value: 'team', label: 'Team Challenge', icon: '👥' },
  ];

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
              <span className="font-bold">Mission Builder</span>
            </div>
            <button
              onClick={handleSaveMission}
              disabled={saving}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Game Info */}
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-quest-sky to-quest-lavender flex items-center justify-center text-3xl">
              🎮
            </div>
            <div>
              <h1 className="text-xl font-bold">Memory Adventure</h1>
              <p className="text-quest-text/60">Computer Science • Memory Hierarchy</p>
            </div>
          </div>
        </div>

        {/* Missions List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Missions ({missions.length})</h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary text-sm"
            >
              + เพิ่ม Mission
            </button>
          </div>

          {missions.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-bold mb-2">ยังไม่มี Mission</h3>
              <p className="text-quest-text/60 mb-6">เริ่มสร้าง Mission แรกของคุณ</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary"
              >
                + เพิ่ม Mission แรก
              </button>
            </div>
          ) : (
            missions.map((mission, index) => (
              <div key={mission.id} className="card p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-quest-sky to-quest-lavender flex items-center justify-center font-bold text-white">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{mission.title}</h3>
                  <div className="flex items-center gap-3 text-sm text-quest-text/60">
                    <span>{mission.type}</span>
                    <span>•</span>
                    <span>{mission.xp} XP</span>
                    <span>•</span>
                    <span>{mission.questions?.length || 0} คำถาม</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingMission(mission)}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteMission(mission.id)}
                    className="p-2 hover:bg-red-50 rounded-xl transition-colors text-red-500"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Mission Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
            <div className="card w-full max-w-2xl p-6 my-8">
              <h3 className="text-xl font-bold mb-4">เพิ่ม Mission</h3>
              
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium mb-2">ชื่อ Mission</label>
                  <input
                    type="text"
                    value={newMission.title}
                    onChange={(e) => setNewMission(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="เช่น Memory Basics"
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">ประเภท</label>
                  <div className="grid grid-cols-3 gap-2">
                    {missionTypes.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setNewMission(prev => ({ ...prev, type: type.value }))}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          newMission.type === type.value ? 'border-quest-sky bg-sky-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-1">{type.icon}</div>
                        <div className="text-xs">{type.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">XP</label>
                  <input
                    type="number"
                    value={newMission.xp}
                    onChange={(e) => setNewMission(prev => ({ ...prev, xp: parseInt(e.target.value) }))}
                    className="input"
                  />
                </div>

                {/* Questions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">คำถาม ({newMission.questions.length})</label>
                  </div>

                  {newMission.questions.map((q, index) => (
                    <div key={q.id} className="p-3 bg-gray-50 rounded-xl mb-2 flex items-center justify-between">
                      <div>
                        <p className="font-medium">คำถาม {index + 1}</p>
                        <p className="text-sm text-quest-text/60">{q.text}</p>
                      </div>
                      <button
                        onClick={() => removeQuestion(q.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}

                  {/* Add Question Form */}
                  <div className="p-4 bg-blue-50 rounded-xl space-y-3">
                    <p className="font-medium text-sm">เพิ่มคำถาม</p>
                    <input
                      type="text"
                      value={newQuestion.text}
                      onChange={(e) => setNewQuestion(prev => ({ ...prev, text: e.target.value }))}
                      placeholder="คำถาม"
                      className="input"
                    />
                    {newQuestion.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correctAnswer"
                          checked={newQuestion.correctAnswer === index}
                          onChange={() => setNewQuestion(prev => ({ ...prev, correctAnswer: index }))}
                          className="w-4 h-4"
                        />
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...newQuestion.options];
                            newOptions[index] = e.target.value;
                            setNewQuestion(prev => ({ ...prev, options: newOptions }));
                          }}
                          placeholder={`ตัวเลือก ${index + 1}`}
                          className="input flex-1"
                        />
                      </div>
                    ))}
                    <p className="text-xs text-quest-text/60">เลือกว่าตัวเลือกไหนคือคำตอบที่ถูกต้อง</p>
                    <button
                      type="button"
                      onClick={addQuestion}
                      className="btn-secondary w-full text-sm"
                    >
                      + เพิ่มคำถาม
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setError('');
                  }}
                  className="btn-secondary flex-1"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSaveMission}
                  disabled={saving}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
