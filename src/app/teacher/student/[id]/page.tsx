'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MASCOT, roundLabel } from '@/lib/utils';
import { questionToTask, answerLabel } from '@/lib/mission-tasks';
import TeacherHeader from '@/components/TeacherHeader';
import { getTeacherSession } from '@/lib/auth';

// หน้า "ผลวิเคราะห์รายคน" ฝั่งครู — อ่านอย่างเดียว สรุปความเข้าใจของนักเรียน
// (ฝั่งครูไม่ควรโดนพาเข้ากระแสของนักเรียน เช่น ปุ่ม "เล่นเกมอื่น")

function StudentAnalysis({ params }: { params: { id: string } }) {
  const studentId = params.id;
  const router = useRouter();
  const sp = useSearchParams();
  const focusGameId = sp.get('gameId') || '';

  const [student, setStudent] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  // แก้ชื่อแบบ inline (ไม่ใช้ prompt — ป้องกัน error จากกล่องโต้ตอบบางสภาพแวดล้อม)
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  const load = async () => {
    try {
      const r = await fetch(`/api/students/${studentId}`);
      const j = await r.json();
      if (!j.success) {
        setError(j.error || 'ไม่พบข้อมูลนักเรียน');
        return false;
      }
      setStudent(j.data);
      const list = j.history || [];
      setHistory(list);
      // ถ้ารอบที่เลือกอยู่โดนลบไป → ขยับไปรอบล่าสุดแทน
      setSelected((prev: any) => {
        const keepId = prev?.playerId;
        const found = list.find((h: any) => h.playerId === keepId);
        if (found) return found;
        const game =
          list.find((h: any) => focusGameId && h.gameId === focusGameId) || list[0] || null;
        return game;
      });
      return true;
    } catch {
      setError('โหลดข้อมูลไม่สำเร็จ');
      return false;
    }
  };

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    (async () => {
      // คุกกี้เซสชันเป็น HttpOnly อ่านจาก JS ไม่ได้ จึงต้องถามเซิร์ฟเวอร์ก่อน
      const session = await getTeacherSession();
      if (cancelled) return;
      if (!session) {
        router.replace('/teacher/login');
        return;
      }
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, focusGameId, router]);

  const renameStudent = async () => {
    if (!student) return;
    setBusy('rename');
    setError('');
    try {
      const r = await fetch(`/api/students/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      }).then((x) => x.json());
      if (r.success) {
        setNotice('แก้ไขชื่อเรียบร้อย');
        setEditingName(false);
        await load();
      } else {
        setError(r.error || 'แก้ไขไม่สำเร็จ');
      }
    } catch {
      setError('บันทึกไม่สำเร็จ ลองใหม่');
    } finally {
      setBusy('');
    }
  };

  const deleteRound = async () => {
    if (!selected) return;
    if (
      !confirm(
        `ลบผลการเล่นรอบนี้?\n\n${roundLabel(selected)}\n\nลบแล้วย้อนกลับไม่ได้ — ลบแค่รอบนี้รอบเดียว สถิติรวมจะถูกหักคืนอัตโนมัติ`
      )
    )
      return;
    setBusy('delete');
    setError('');
    try {
      const r = await fetch(`/api/players/${selected.playerId}`, {
        method: 'DELETE',
      }).then((x) => x.json());
      if (r.success) {
        setNotice('ลบรอบนี้แล้ว — สถิติรวมถูกหักคืนแล้ว');
        await load();
      } else {
        setError(r.error || 'ลบไม่สำเร็จ');
      }
    } catch {
      setError('ลบไม่สำเร็จ ลองใหม่');
    } finally {
      setBusy('');
    }
  };

  // โหลดคำถามของเกมที่เลือกรอบนั้น — ไว้แมปชื่อด่าน + ตัวเลือกคำตอบ
  useEffect(() => {
    if (!selected?.gameId) return;
    let cancelled = false;
    fetch(`/api/missions?gameId=${selected.gameId}`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j.success) setMissions(j.data || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selected?.gameId, selected?.playerId]);

  const missionById = useMemo(() => {
    const mm = new Map<string, any>();
    missions.forEach((m: any) => mm.set(m.id, m));
    return mm;
  }, [missions]);

  const questionById = useMemo(() => {
    const qm = new Map<string, any>();
    missions.forEach((m: any) => (m.questions || []).forEach((q: any) => qm.set(q.id, q)));
    return qm;
  }, [missions]);

  // รวมคำตอบรายข้อ → เป็นคะแนนรายด่าน
  const missionRows = useMemo(() => {
    if (!selected) return [];
    const agg = new Map<string, any>();
    for (const a of selected.answers || []) {
      const key = a.missionId || 'unknown';
      const cur = agg.get(key) || { id: key, correct: 0, total: 0, xp: 0, bonus: 0 };
      cur.total += 1;
      if (a.correct) cur.correct += 1;
      cur.xp += a.xp || 0;
      cur.bonus += a.bonus || 0;
      agg.set(key, cur);
    }
    return [...agg.values()]
      .map((m: any) => {
        const mission = missionById.get(m.id);
        return {
          ...m,
          name: mission?.title || 'ด่านอื่นๆ',
          boss: mission?.type === 'boss',
          order: Number(mission?.order) || 99,
          pct: m.total > 0 ? Math.round((m.correct / m.total) * 100) : 0,
        };
      })
      .sort((a: any, b: any) => (a.boss ? 1 : 0) - (b.boss ? 1 : 0) || a.order - b.order);
  }, [selected, missionById]);

  const strongRows = missionRows.filter((r: any) => r.total > 0 && r.pct >= 80);
  const weakRows = missionRows.filter((r: any) => r.total > 0 && r.pct < 60);

  const summaryParts = useMemo(() => {
    const parts: string[] = [];
    if (strongRows.length > 0)
      parts.push(
        `เก่งเรื่อง${strongRows.map((r: any) => r.name).join(' / ')} (ถูก ${strongRows
          .map((r: any) => `${r.correct}/${r.total}`)
          .join(', ')})`
      );
    if (weakRows.length > 0)
      parts.push(
        `ควรทบทวนเรื่อง${weakRows.map((r: any) => `${r.name} (ถูก ${r.correct}/${r.total})`).join(', ')}`
      );
    if (strongRows.length > 0 && weakRows.length === 0) parts.push('เข้าใจครบทุกหัวข้อที่เล่นแล้ว 🎉');
    const totalBonus = (selected?.answers || []).reduce((a: number, x: any) => a + (x.bonus || 0), 0);
    if (totalBonus > 0) parts.push(`ตอบไว ได้โบนัสพิเศษรวม +${totalBonus} XP`);
    return parts;
  }, [strongRows, weakRows, selected]);

  const accAll =
    (student?.totalAnswers || 0) > 0
      ? Math.round(((student?.correctAnswers || 0) / (student?.totalAnswers || 0)) * 100)
      : 0;

  // ข้อความคำตอบ — รองรับทุกชนิด (ตัวเลือก/กรอกตัวเลข/จับคู่) ผ่านชั้นแกนกลาง
  const optText = (answer: any, value: any) =>
    answerLabel(questionToTask(questionById.get(answer.questionId), 0), value);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">{MASCOT.emoji}</div>
          <p className="text-quest-text/60">กำลังโหลดผลวิเคราะห์...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TeacherHeader
        title="ผลวิเคราะห์รายคน"
        subtitle={student ? `${student.name} ${selected ? `• ${selected.gameName}` : ''}` : 'นักเรียน'}
        backHref={focusGameId ? `/teacher/analytics?gameId=${focusGameId}` : '/teacher/analytics'}
      />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="card p-6 text-center">
            <div className="text-4xl mb-3">😢</div>
            <p className="text-quest-text/60">{error}</p>
            <a href="/teacher/analytics" className="btn-primary mt-4 inline-block">
              ← กลับไปผลวิเคราะห์
            </a>
          </div>
        )}

        {!error && !student && (
          <div className="card p-8 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-quest-text/60">ไม่พบข้อมูลนักเรียน</p>
          </div>
        )}

        {!error && student && (
          <>
            {/* สรุปยอดรวมทุกครั้งที่เล่น */}
            <div className="card p-5 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-4xl animate-float">{student.avatar}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold truncate">{student.name}</h2>
                  <p className="text-xs text-quest-text/60">สรุปรวมทุกครั้งที่เล่น</p>
                </div>
                {editingName ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="text"
                      maxLength={30}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') renameStudent();
                        if (e.key === 'Escape') setEditingName(false);
                      }}
                      className="input w-40 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={renameStudent}
                      disabled={!editName.trim() || busy === 'rename'}
                      className="px-3 py-1.5 rounded-xl text-xs bg-quest-sky text-white shrink-0 disabled:opacity-50"
                    >
                      💾 บันทึก
                    </button>
                    <button
                      onClick={() => setEditingName(false)}
                      className="px-3 py-1.5 rounded-xl text-xs bg-white hover:bg-gray-100 text-quest-text/70 shrink-0"
                    >
                      ยกเลิก
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditName(student.name);
                      setEditingName(true);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs bg-white hover:bg-sky-50 text-quest-text/70 shrink-0"
                  >
                    ✏️ แก้ชื่อ
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-2xl font-bold text-quest-sky">{student.totalXp || 0}</p>
                  <p className="text-xs text-quest-text/60">XP รวม</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-500">{history.length}</p>
                  <p className="text-xs text-quest-text/60">ครั้งที่เล่น</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{student.correctAnswers || 0}</p>
                  <p className="text-xs text-quest-text/60">ตอบถูก</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-quest-text">{accAll}%</p>
                  <p className="text-xs text-quest-text/60">ความแม่นยำ</p>
                </div>
              </div>
            </div>

            {history.length === 0 ? (
              <div className="card p-8 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-quest-text/60">นักเรียนคนนี้ยังไม่มีประวัติการเล่น</p>
              </div>
            ) : selected ? (
              <>
                {history.length > 1 && (
                  <select
                    value={selected.playerId}
                    onChange={(e) => setSelected(history.find((h: any) => h.playerId === e.target.value))}
                    className="input mb-4"
                  >
                    {history.map((h: any) => (
                      <option key={h.playerId} value={h.playerId}>
                        {roundLabel(h)}
                      </option>
                    ))}
                  </select>
                )}

                {notice && (
                  <div className="mb-4 p-3 bg-green-50 rounded-2xl text-sm text-green-700 font-medium">
                    ✅ {notice}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                  <p className="text-xs text-quest-text/60">
                    ลบรอบนี้เมื่อเด็กเข้าร่วมผิดพลาด / กดผิดรอบ
                  </p>
                  <button
                    onClick={deleteRound}
                    disabled={busy === 'delete'}
                    className="px-3 py-2 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium disabled:opacity-50"
                  >
                    🗑️ ลบรอบนี้
                  </button>
                </div>

                {/* สรุปความเข้าใจรายด่าน */}
                <div className="card p-6 mb-6">
                  <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                    <h2 className="text-lg font-bold">📊 สรุปความเข้าใจ</h2>
                    <span className="text-xs text-quest-text/60 tabular-nums">{roundLabel(selected)}</span>
                  </div>

                  {missionRows.length === 0 ? (
                    <div className="p-6 text-center text-quest-text/60 text-sm">
                      ยังไม่มีคำตอบในรอบนี้
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {missionRows.map((m: any) => (
                          <div key={m.id}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className={`font-medium ${m.boss ? 'text-red-500' : ''}`}>
                                {m.boss ? '👹 ' : ''}
                                {m.name}
                              </span>
                              <span className="text-quest-text/60">
                                {m.correct}/{m.total} ข้อ • {m.pct}%
                              </span>
                            </div>
                            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  m.pct === 100
                                    ? 'bg-green-500'
                                    : m.pct >= 60
                                    ? 'bg-accent-400'
                                    : 'bg-warm-400'
                                }`}
                                style={{ width: `${m.pct}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* ป้ายสรุป */}
                      {(strongRows.length > 0 || weakRows.length > 0) && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {strongRows.length > 0 && (
                            <span className="px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                              💪 เก่ง: {strongRows.map((r: any) => r.name).join(', ')}
                            </span>
                          )}
                          {weakRows.length > 0 && (
                            <span className="px-3 py-1.5 rounded-full bg-warm-100 text-warm-700 text-sm font-medium">
                              📚 ควรฝึก: {weakRows.map((r: any) => r.name).join(', ')}
                            </span>
                          )}
                        </div>
                      )}

                      {summaryParts.length > 0 && (
                        <div className="mt-4 p-4 bg-sky-50 rounded-2xl text-sm text-quest-text leading-relaxed">
                          <span className="font-bold text-quest-sky">สรุป: </span>
                          {summaryParts.join(' • ')}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* คำตอบรายข้อ */}
                <div className="card p-6">
                  <h2 className="text-lg font-bold mb-4">🔎 คำตอบรายข้อ</h2>
                  {(selected.answers || []).length === 0 ? (
                    <div className="p-6 text-center text-quest-text/60 text-sm">
                      ยังไม่มีคำตอบในรอบนี้
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(selected.answers || []).map((a: any, i: number) => {
                        const expl =
                          questionById.get(a.questionId)?.explanation || a.explanation || '';
                        return (
                          <div
                            key={a.id || i}
                            className={`card p-4 ${a.correct ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'}`}
                          >
                            <div className="flex items-start gap-2 mb-2">
                              <span className="text-lg">{a.correct ? '✅' : '❌'}</span>
                              <p className="font-medium flex-1">
                                {a.questionText || `คำถามข้อที่ ${i + 1}`}
                              </p>
                              <span className="text-xs font-bold text-green-600 shrink-0">
                                +{a.xp || 0} XP
                                {a.bonus > 0 ? ` (+${a.bonus} โบนัส)` : ''}
                              </span>
                            </div>
                            <div className="text-sm text-quest-text/70 ml-7 space-y-0.5">
                              {a.correct ? (
                                <p>ตอบ {optText(a, a.selectedAnswer)} ถูกต้อง</p>
                              ) : (
                                <>
                                  <p>ตอบ {optText(a, a.selectedAnswer)}</p>
                                  <p>คำตอบที่ถูกคือ {optText(a, a.correctAnswer)}</p>
                                  {expl ? (
                                    <p className="mt-1 text-quest-text/60">💡 {expl}</p>
                                  ) : null}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export default function TeacherStudentPage({ params }: { params: { id: string } }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-6xl animate-bounce">🦊</div>
        </div>
      }
    >
      <StudentAnalysis params={params} />
    </Suspense>
  );
}