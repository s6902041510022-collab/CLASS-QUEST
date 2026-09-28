'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { isTeacherLoggedIn } from '@/lib/auth';
import { BOSS_DAMAGE_PER_CORRECT } from '@/lib/utils';
import TeacherHeader from '@/components/TeacherHeader';

type Question = {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
};

type Mission = {
  id: string;
  gameId?: string;
  order: number;
  title: string;
  type: string;
  xp: number;
  timeLimit: number;
  questions: Question[];
};

type Game = {
  id: string;
  name: string;
  subject?: string;
  topic?: string;
};

const uid = () =>
  typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const blankQuestion = (): Question => ({
  id: uid(),
  text: '',
  options: ['', '', '', ''],
  correctAnswer: 0,
  explanation: '',
});

const blankForm = () => ({ title: '', xp: 100, timeLimit: 60, type: 'quiz' as 'quiz' | 'boss', questions: [] as Question[] });

function MissionsBuilder() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryGameId = searchParams.get('gameId');

  const [games, setGames] = useState<Game[]>([]);
  const [gameId, setGameId] = useState(queryGameId || '');
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);

  // โหลดรายชื่อเกม + เลือกเกมแรกถ้ายังไม่ได้เลือก
  useEffect(() => {
    (async () => {
      try {
        const response = await fetch('/api/games');
        const result = await response.json();
        if (!result.success) return;
        const list: Game[] = result.data || [];
        setGames(list);
        if (!queryGameId && list.length > 0) {
          setGameId(list[0].id);
          router.replace(`/teacher/missions?gameId=${list[0].id}`);
        }
      } catch {
        setError('โหลดรายชื่อเกมไม่สำเร็จ');
      }
    })();
  }, [queryGameId, router]);

  useEffect(() => {
    if (queryGameId) setGameId(queryGameId);
  }, [queryGameId]);

  // โหลด mission ของเกมที่เลือก
  const loadMissions = useCallback(async (id: string) => {
    if (!id) {
      setMissions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/missions?gameId=${id}`);
      const result = await response.json();
      if (result.success) setMissions(result.data || []);
      else setError('โหลดคำถามไม่สำเร็จ');
    } catch {
      setError('โหลดคำถามไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isTeacherLoggedIn()) {
      router.replace('/teacher/login');
      return;
    }
    loadMissions(gameId);
  }, [router, gameId, loadMissions]);

  const currentGame = games.find((g) => g.id === gameId);

  const switchGame = (id: string) => {
    setGameId(id);
    setError('');
    router.replace(`/teacher/missions?gameId=${id}`);
  };

  // ---------- ฟอร์ม ----------
  const openCreate = () => {
    setEditingId(null);
    setForm(blankForm());
    setError('');
    setModalOpen(true);
  };

  const openEdit = (mission: Mission) => {
    setEditingId(mission.id);
    setForm({
      title: mission.title || '',
      xp: mission.xp ?? 100,
      timeLimit: mission.timeLimit ?? 60,
      type: mission.type === 'boss' ? 'boss' : 'quiz',
      questions: (mission.questions || []).map((q) => ({
        id: q.id || uid(),
        text: q.text || '',
        options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ['', '', '', ''],
        correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
        explanation: q.explanation || '',
      })),
    });
    setError('');
    setModalOpen(true);
  };

  const setQuestion = (id: string, patch: Partial<Question>) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    }));
  };

  const setOption = (questionId: string, index: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => {
        if (q.id !== questionId) return q;
        const options = [...q.options];
        options[index] = value;
        return { ...q, options };
      }),
    }));
  };

  const removeQuestion = (id: string) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.id !== id),
    }));
  };

  const moveQuestion = (index: number, direction: -1 | 1) => {
    setForm((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.questions.length) return prev;
      const questions = [...prev.questions];
      [questions[index], questions[target]] = [questions[target], questions[index]];
      return { ...prev, questions };
    });
  };

  const save = async () => {
    if (!form.title.trim()) {
      setError('กรอกชื่อ Mission');
      return;
    }
    if (form.questions.length === 0) {
      setError('เพิ่มคำถามอย่างน้อย 1 ข้อ');
      return;
    }
    const incomplete = form.questions.some(
      (q) => !q.text.trim() || q.options.some((o) => !o.trim())
    );
    if (incomplete) {
      setError('กรอกคำถามและตัวเลือกให้ครบทุกช่อง');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const url = editingId ? `/api/missions/${editingId}` : '/api/missions';
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          title: form.title,
          type: form.type,
          xp: Number(form.xp) || 100,
          timeLimit: Math.max(0, Math.min(3600, Number(form.timeLimit) || 0)),
          questions: form.questions,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setModalOpen(false);
        setForm(blankForm());
        setEditingId(null);
        loadMissions(gameId);
      } else {
        setError(result.error || 'บันทึกไม่สำเร็จ');
      }
    } catch {
      setError('บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setSaving(false);
    }
  };

  const deleteMission = async (mission: Mission) => {
    if (!confirm(`ต้องการลบ Mission "${mission.title}" หรือไม่?`)) return;
    try {
      const response = await fetch(`/api/missions/${mission.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) loadMissions(gameId);
      else setError(result.error || 'ลบไม่สำเร็จ');
    } catch {
      setError('ลบไม่สำเร็จ ลองใหม่อีกครั้ง');
    }
  };

  const moveMission = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= missions.length) return;
    const reordered = [...missions];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setMissions(reordered);
    try {
      await Promise.all(
        reordered.map((m, i) =>
          fetch(`/api/missions/${m.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: i + 1 }),
          })
        )
      );
      loadMissions(gameId);
    } catch {
      setError('จัดลำดับไม่สำเร็จ');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TeacherHeader
        title="จัดการคำถาม"
        subtitle={currentGame ? currentGame.name : 'ยังไม่ได้เลือกเกม'}
        backHref="/teacher/games"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {games.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-5xl mb-4">🎮</div>
            <h3 className="text-xl font-bold mb-1">ยังไม่มีเกม</h3>
            <p className="text-quest-text/60 mb-6">สร้างเกมก่อน แล้วค่อยเพิ่มคำถาม</p>
            <Link href="/teacher/create" className="btn-primary">
              + สร้างเกม
            </Link>
          </div>
        ) : (
          <>
            <div className="card p-5 mb-6">
              <label className="block text-sm font-medium mb-2">เกม</label>
              <select
                value={gameId}
                onChange={(e) => switchGame(e.target.value)}
                className="input"
              >
                {games.map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.name || 'ไม่มีชื่อ'}
                  </option>
                ))}
              </select>
              {currentGame ? (
                <p className="text-sm text-quest-text/60 mt-2">
                  {currentGame.subject || 'ไม่ระบุวิชา'}
                  {currentGame.topic ? ` • ${currentGame.topic}` : ''}
                </p>
              ) : null}
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl">{error}</div>
            )}

            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold">Mission ({missions.length})</h2>
              <button onClick={openCreate} className="btn-primary text-sm shrink-0">
                + เพิ่ม Mission
              </button>
            </div>

            {loading ? (
              <p className="text-center py-12 text-quest-text/60">กำลังโหลด...</p>
            ) : missions.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="text-5xl mb-4">📝</div>
                <h3 className="text-xl font-bold mb-1">ยังไม่มี Mission</h3>
                <p className="text-quest-text/60 mb-6">เพิ่ม Mission และคำถามแรกของคุณ</p>
                <button onClick={openCreate} className="btn-primary">
                  + เพิ่ม Mission แรก
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {missions.map((mission, index) => (
                  <div key={mission.id} className="card p-4">
                    <div className="flex items-center gap-3">
                      <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shrink-0 ${
                        mission.type === 'boss'
                          ? 'bg-gradient-to-br from-red-400 to-red-600'
                          : 'bg-gradient-to-br from-quest-sky to-quest-lavender'
                      }`}
                    >
                      {mission.type === 'boss' ? '👹' : index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium truncate">
                        {mission.title}
                        {mission.type === 'boss' && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-medium align-middle">
                            BOSS
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-quest-text/60">
                        {mission.xp} XP • {mission.questions?.length || 0} คำถาม •{' '}
                        {mission.timeLimit ? `⏱️ ${mission.timeLimit} วิ/ข้อ` : 'ไม่จับเวลา'}
                        {
                          mission.type === 'boss' &&
                            ` • ตอบถูก = บอสเสีย ${BOSS_DAMAGE_PER_CORRECT} HP`
                        }
                      </p>
                    </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        onClick={() => openEdit(mission)}
                        className="px-3 py-2 rounded-2xl bg-quest-sky text-white text-sm font-medium hover:opacity-90"
                      >
                        ✏️ แก้ไขคำถาม
                      </button>
                      <button
                        onClick={() => moveMission(index, -1)}
                        disabled={index === 0}
                        className="px-3 py-2 rounded-2xl bg-gray-100 hover:bg-gray-200 text-sm font-medium disabled:opacity-40"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveMission(index, 1)}
                        disabled={index === missions.length - 1}
                        className="px-3 py-2 rounded-2xl bg-gray-100 hover:bg-gray-200 text-sm font-medium disabled:opacity-40"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => deleteMission(mission)}
                        className="px-3 py-2 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium"
                      >
                        🗑️ ลบ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 overflow-y-auto">
          <div className="card w-full max-w-2xl p-6 my-8">
            <h3 className="text-xl font-bold mb-4">
              {editingId ? 'แก้ไข Mission' : 'เพิ่ม Mission'}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-2">ชื่อ Mission</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="เช่น Memory Basics"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">XP</label>
                  <input
                    type="number"
                    value={form.xp}
                    onChange={(e) => setForm({ ...form, xp: Number(e.target.value) })}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">⏱️ เวลาต่อคำถาม (วินาที)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min={0}
                    max={3600}
                    value={form.timeLimit}
                    onChange={(e) => setForm({ ...form, timeLimit: Number(e.target.value) })}
                    className="input w-32"
                  />
                  <div className="flex gap-1.5 flex-wrap">
                    {[30, 45, 60, 90].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setForm({ ...form, timeLimit: sec })}
                        className={`px-3 py-1.5 rounded-xl text-sm font-medium ${
                          form.timeLimit === sec
                            ? 'bg-quest-sky text-white'
                            : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                        }`}
                      >
                        {sec} วิ
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-quest-text/60 mt-2">
                  ใส่ 0 = ไม่จับเวลา • ครูยังบวก/ลดเวลาได้ตอนเล่นจริงเสมอ
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">ประเภท Mission</label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'quiz' })}
                    className={`px-4 py-2.5 rounded-2xl text-sm font-medium transition-all ${
                      form.type === 'quiz'
                        ? 'bg-quest-sky text-white shadow-sm'
                        : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                    }`}
                  >
                    📚 แบบฝึกหัดปกติ
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'boss' })}
                    className={`px-4 py-2.5 rounded-2xl text-sm font-medium transition-all ${
                      form.type === 'boss'
                        ? 'bg-red-500 text-white shadow-sm'
                        : 'bg-red-50 text-red-600 hover:bg-red-100'
                    }`}
                  >
                    👹 ด่านบอส
                  </button>
                </div>
                {form.type === 'boss' ? (
                  <p className="text-xs text-quest-text/60 mt-2">
                    เล่นตอนสุดท้ายหลังจบด่านควิซทั้งหมด — นักเรียนตอบถูก 1 ข้อ = บอสเสีย {BOSS_DAMAGE_PER_CORRECT} HP
                    เมื่อ HP บอสหมด = ชนะ (คำตอบบอสยังนับคะแนนปกติ)
                  </p>
                ) : (
                  <p className="text-xs text-quest-text/60 mt-2">
                    เล่นตามลำดับ ครูกด &quot;ถัดไป&quot; เพื่อเลื่อนด่านเอง
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">
                    คำถาม ({form.questions.length})
                  </label>
                  <button
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        questions: [...prev.questions, blankQuestion()],
                      }))
                    }
                    className="px-3 py-1.5 rounded-xl bg-quest-sky text-white text-sm font-medium hover:opacity-90"
                  >
                    + เพิ่มคำถาม
                  </button>
                </div>

                {form.questions.length === 0 ? (
                  <div className="p-6 text-center bg-gray-50 rounded-2xl text-quest-text/60 text-sm">
                    ยังไม่มีคำถาม — กดปุ่ม &quot;+ เพิ่มคำถาม&quot; เพื่อเริ่ม
                  </div>
                ) : (
                  <div className="space-y-3">
                    {form.questions.map((question, index) => (
                      <div key={question.id} className="p-4 bg-gray-50 rounded-2xl">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-sm">คำถามที่ {index + 1}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => moveQuestion(index, -1)}
                              disabled={index === 0}
                              className="w-8 h-8 rounded-xl bg-white hover:bg-gray-200 text-sm disabled:opacity-40"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => moveQuestion(index, 1)}
                              disabled={index === form.questions.length - 1}
                              className="w-8 h-8 rounded-xl bg-white hover:bg-gray-200 text-sm disabled:opacity-40"
                            >
                              ↓
                            </button>
                            <button
                              onClick={() => removeQuestion(question.id)}
                              className="w-8 h-8 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-sm"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        <textarea
                          rows={2}
                          value={question.text}
                          onChange={(e) => setQuestion(question.id, { text: e.target.value })}
                          placeholder="ใส่คำถาม..."
                          className="input resize-none mb-3"
                        />

                        <div className="space-y-2">
                          {question.options.map((option, optionIndex) => (
                            <div key={optionIndex} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct-${question.id}`}
                                checked={question.correctAnswer === optionIndex}
                                onChange={() =>
                                  setQuestion(question.id, { correctAnswer: optionIndex })
                                }
                                className="w-5 h-5 shrink-0"
                              />
                              <span className="w-6 text-sm font-medium text-quest-text/60 shrink-0">
                                {String.fromCharCode(65 + optionIndex)}
                              </span>
                              <input
                                type="text"
                                value={option}
                                onChange={(e) =>
                                  setOption(question.id, optionIndex, e.target.value)
                                }
                                placeholder={`ตัวเลือก ${String.fromCharCode(65 + optionIndex)}`}
                                className="input flex-1"
                              />
                            </div>
                          ))}
                        </div>

                        <p className="text-xs text-quest-text/60 mt-2">
                          กดวงกลมข้างตัวเลือก เพื่อทำเครื่องหมายว่าเป็นคำตอบที่ถูกต้อง
                        </p>

                        <input
                          type="text"
                          value={question.explanation || ''}
                          onChange={(e) => setQuestion(question.id, { explanation: e.target.value })}
                          placeholder="คำอธิบายคำตอบ (ไม่บังคับ)"
                          className="input mt-3"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setModalOpen(false);
                  setError('');
                  setEditingId(null);
                }}
                className="btn-secondary flex-1"
              >
                ยกเลิก
              </button>
              <button onClick={save} disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MissionBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-bounce">🦊</div>
            <p className="text-quest-text/60">กำลังโหลด...</p>
          </div>
        </div>
      }
    >
      <MissionsBuilder />
    </Suspense>
  );
}
