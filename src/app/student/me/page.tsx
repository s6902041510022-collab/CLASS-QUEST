'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MASCOT, roundLabel } from '@/lib/utils';
import { questionToTask, answerLabel } from '@/lib/mission-tasks';
import HomeButton from '@/components/HomeButton';

function Me() {
  const sp = useSearchParams();
  const gameId = sp.get('gameId') || '';
  const studentId = sp.get('studentId') || '';

  const [student, setStudent] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'summary' | 'detail' | 'history'>(
    gameId ? 'detail' : 'history'
  );
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    // ⚠️ ต้อง setLoading(false) ตรงนี้ด้วย
    //    เคยเป็น `if (!studentId) return;` เฉย ๆ → loading ค้าง true ตลอด
    //    คนที่เปิด /student/me ตรง ๆ (ไม่มี ?studentId=) เจอหน้า "กำลังโหลด..." ค้างถาวร
    //    และไปไม่ถึง fallback "ไม่พบข้อมูลของคุณ" ที่เขียนไว้ด้านล่าง
    if (!studentId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const r = await fetch(`/api/students/${studentId}`);
        const j = await r.json();
        if (j.success) {
          setStudent(j.data);
          setHistory(j.history || []);
          if (gameId) {
            setSelected((j.history || []).find((h: any) => h.gameId === gameId) || null);
          } else {
            setSelected((j.history || [])[0] || null);
          }
        }
      } catch {
        /* ไม่ critical */
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId, gameId]);

  // โหลดคำถามของเกมที่เลือกรอบนั้น — ไว้แมปชื่อด่าน + ตัวเลือกคำตอบ + คำอธิบาย
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

  // ==== สรุปความเข้าใจรายด่าน (เหมือนฝั่งครู) ====
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

  // ข้อความคำตอบ — รองรับทุกชนิด (ตัวเลือก/กรอกตัวเลข/จับคู่) ผ่านชั้นแกนกลาง
  const optText = (answer: any, value: any) =>
    answerLabel(questionToTask(questionById.get(answer.questionId), 0), value);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-lavender-50 to-mint-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">{MASCOT.emoji}</div>
          <p className="text-quest-text/60">กำลังโหลดผลของคุณ...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-lavender-50 to-mint-50 flex items-center justify-center p-4">
        <div className="card w-full max-w-md p-8 text-center">
          <div className="text-5xl mb-4">😢</div>
          <h2 className="text-xl font-bold mb-2">ไม่พบข้อมูลของคุณ</h2>
          <Link href="/student/join" className="btn-primary mt-4">
            เข้าร่วมเกม
          </Link>
        </div>
      </div>
    );
  }

  const accuracy =
    (student.totalAnswers || 0) > 0
      ? Math.round(((student.correctAnswers || 0) / student.totalAnswers) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-lavender-50 to-mint-50 p-4">
      <div className="fixed top-4 left-4 z-50">
        <HomeButton />
      </div>
      <div className="max-w-2xl mx-auto py-6">
        <div className="text-center mb-6">
          <div className="text-6xl mb-3 animate-float">{student.avatar}</div>
          <h1 className="text-2xl font-bold">{student.name}</h1>
          <p className="text-quest-text/60 text-sm">ผลการเล่นของฉัน</p>
        </div>

        {/* สรุปรวมตลอดกาล */}
        <div className="card p-5 mb-4">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-xl font-bold text-quest-sky">{student.totalXp || 0}</p>
              <p className="text-xs text-quest-text/60">XP รวม</p>
            </div>
            <div>
              <p className="text-xl font-bold text-purple-500">{student.gamesPlayed || 0}</p>
              <p className="text-xs text-quest-text/60">เล่นไป</p>
            </div>
            <div>
              <p className="text-xl font-bold text-green-600">{student.correctAnswers || 0}</p>
              <p className="text-xs text-quest-text/60">ตอบถูก</p>
            </div>
            <div>
              <p className="text-xl font-bold text-quest-text">{accuracy}%</p>
              <p className="text-xs text-quest-text/60">ความแม่นยำ</p>
            </div>
          </div>
        </div>

        {/* แท็บ */}
        <div className="flex gap-2 mb-4">
          {(
            [
              ['detail', '📋 คำตอบของฉัน'],
              ['history', '🕐 ประวัติ'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 p-3 rounded-2xl font-medium text-sm transition-colors ${
                tab === key ? 'bg-quest-sky text-white' : 'bg-white text-quest-text/70'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'detail' ? (
          history.length === 0 ? (
            <div className="card p-8 text-center">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-quest-text/60">ยังไม่มีประวัติการเล่น</p>
            </div>
          ) : (
            <>
              {history.length > 1 && (
                <select
                  value={selected?.playerId || ''}
                  onChange={(e) =>
                    setSelected(history.find((h: any) => h.playerId === e.target.value))
                  }
                  className="input mb-4"
                >
                  {history.map((h: any) => (
                    <option key={h.playerId} value={h.playerId}>
                      {roundLabel(h)}
                    </option>
                  ))}
                </select>
              )}
              {selected ? (
                  <RoundDetail
                    round={selected}
                    missionRows={missionRows}
                    strongRows={strongRows}
                    weakRows={weakRows}
                    summaryParts={summaryParts}
                    questionById={questionById}
                    optText={optText}
                  />
                ) : null}
            </>
          )
        ) : (
          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="card p-8 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-quest-text/60">ยังไม่มีประวัติการเล่น</p>
              </div>
            ) : (
              history.map((h: any) => (
                <button
                  key={h.playerId}
                  onClick={() => {
                    setSelected(h);
                    setTab('detail');
                  }}
                  className="w-full card p-4 flex items-center gap-3 text-left hover:shadow-card transition-shadow"
                >
                  <div className="text-center shrink-0">
                    <p className="text-lg font-bold text-quest-sky">{h.xp}</p>
                    <p className="text-xs text-quest-text/60">XP</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{h.gameName}</p>
                    <p className="text-xs text-quest-text/60">
                      ถูก {h.correct}/{h.total} ข้อ • {new Date(h.joinedAt).toLocaleDateString('th-TH')}
                    </p>
                  </div>
                  <span className="text-quest-text/30">›</span>
                </button>
              ))
            )}
          </div>
        )}

        <Link href="/student/join" className="btn-primary w-full mt-6">
          เล่นเกมอื่น
        </Link>
      </div>
    </div>
  );
}

// แสดงรายละเอียดรอบเดียว: สรุปความเข้าใจรายด่าน + ถูก/ผิดข้อไหน พร้อมเฉลยและคำอธิบาย
function RoundDetail({
  round,
  missionRows,
  strongRows,
  weakRows,
  summaryParts,
  questionById,
  optText,
}: any) {
  const acc = round.total > 0 ? Math.round((round.correct / round.total) * 100) : 0;
  const answers = round.answers || [];
  const wrongAnswers = answers
    .map((a: any, i: number) => ({ a, n: i + 1 }))
    .filter(({ a }: any) => !a.correct);
  const totalBonus = answers.reduce((s: number, x: any) => s + (x.bonus || 0), 0);
  // คำชมให้เด็ก — เน้นจุดเด่น/ความพยายาม ไม่ตำหนิ
  const praise: string[] = [];
  if (answers.length > 0) {
    if (wrongAnswers.length === 0) praise.push('สุดยอด! ตอบถูกทุกข้อเลย 🎉');
    if (strongRows.length > 0)
      praise.push(`เก่งเรื่อง ${strongRows.map((r: any) => r.name).join(', ')} มาก`);
    if (totalBonus > 0) praise.push(`ตอบไวมาก ได้โบนัสพิเศษ +${totalBonus} XP ⚡`);
    if (praise.length === 0 && round.correct > 0) praise.push(`ตั้งใจมาก ได้ ${round.xp} XP เก่งแล้ว 💪`);
    if (praise.length === 0 && wrongAnswers.length > 0) praise.push('กล้าลองผิดลองถูก ยิ่งฝึกยิ่งเก่ง 💪');
  }
  return (
    <div className="space-y-3">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
          <h2 className="font-bold">{round.gameName}</h2>
          <span className="text-quest-text/60 text-sm tabular-nums">{roundLabel(round)}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-3 bg-sky-50 rounded-2xl">
            <p className="text-xl font-bold text-quest-sky">{round.xp}</p>
            <p className="text-xs text-quest-text/60">ได้ XP</p>
          </div>
          <div className="p-3 bg-green-50 rounded-2xl">
            <p className="text-xl font-bold text-green-600">
              {round.correct}/{round.total}
            </p>
            <p className="text-xs text-quest-text/60">ตอบถูก</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-2xl">
            <p className="text-xl font-bold text-purple-600">{acc}%</p>
            <p className="text-xs text-quest-text/60">ความแม่นยำ</p>
          </div>
        </div>
      </div>

      {/* สรุปความเข้าใจรายด่าน */}
      <div className="card p-5">
        <h2 className="font-bold mb-3">🧠 สรุปความเข้าใจ</h2>
        {missionRows.length === 0 ? (
          <p className="text-sm text-quest-text/60 text-center py-3">ยังไม่มีข้อมูลรายด่าน</p>
        ) : (
          <>
            <div className="space-y-2.5">
              {missionRows.map((m: any) => (
                <div key={m.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className={`font-medium ${m.boss ? 'text-red-500' : ''}`}>
                      {m.boss ? '👹 ' : ''}
                      {m.name}
                    </span>
                    <span className="text-quest-text/60 tabular-nums">
                      {m.pct}% (ถูก {m.correct}/{m.total})
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        m.pct >= 80 ? 'bg-green-500' : m.pct >= 60 ? 'bg-amber-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${m.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {(strongRows.length > 0 || weakRows.length > 0) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {strongRows.length > 0 && (
                  <span className="px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                    💪 เก่ง: {strongRows.map((r: any) => r.name).join(', ')}
                  </span>
                )}
                {weakRows.length > 0 && (
                  <span className="px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">
                    📚 ควรฝึก: {weakRows.map((r: any) => r.name).join(', ')}
                  </span>
                )}
              </div>
            )}

            {summaryParts.length > 0 && (
              <div className="mt-3 p-3 bg-sky-50 rounded-2xl text-sm leading-relaxed">
                <span className="font-bold text-quest-sky">สรุป: </span>
                {summaryParts.join(' • ')}
              </div>
            )}

            {/* ข้อที่ยังตอบผิด — บอกชัดว่าต้องทบทวนข้อไหน */}
            {wrongAnswers.length > 0 && (
              <div className="mt-3 p-3 bg-red-50 rounded-2xl">
                <p className="text-sm font-bold text-red-600 mb-2">
                  ❌ ข้อที่ยังตอบผิด ({wrongAnswers.length} ข้อ) — ลองทบทวนข้อเหล่านี้ดูนะ
                </p>
                <div className="space-y-2">
                  {wrongAnswers.map(({ a, n }: any) => {
                    const q = questionById.get(a.questionId);
                    const expl = q?.explanation || a.explanation || '';
                    return (
                      <p key={a.id || n} className="text-sm text-quest-text/80">
                        <span className="font-bold">ข้อ {n}:</span> {a.questionText || `คำถามที่ ${n}`}
                        <span className="block text-xs text-quest-text/60 mt-0.5">
                          ตอบถูกคือ {optText(a, a.correctAnswer)}
                          {expl ? ` — 💡 ${expl}` : ''}
                        </span>
                      </p>
                    );
                  })}
                </div>
              </div>
            )}

            {/* คำชม — ชื่นชมจุดเด่นและความพยายาม */}
            {praise.length > 0 && (
              <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200">
                <p className="text-sm font-bold text-amber-700">🌟 คำชมของคุณ</p>
                <ul className="mt-1 space-y-1 text-sm text-quest-text/80">
                  {praise.map((t: string, i: number) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {/* คำตอบรายข้อ พร้อมเฉลย/คำอธิบาย */}
      <div className="card p-5">
        <h2 className="font-bold mb-3">🔎 คำตอบรายข้อ</h2>
        {(round.answers || []).length === 0 ? (
          <p className="text-sm text-quest-text/60 text-center py-4">ยังไม่ได้ตอบคำถามในรอบนี้</p>
        ) : (
          <div className="space-y-3">
            {round.answers.map((a: any, i: number) => {
              const expl = questionById.get(a.questionId)?.explanation || a.explanation || '';
              return (
                <div
                  key={a.id || i}
                  className={`card p-4 ${a.correct ? 'bg-green-50/50' : 'bg-red-50/50'}`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-lg">{a.correct ? '✅' : '❌'}</span>
                    <p className="font-medium flex-1">{a.questionText || `คำถามที่ ${i + 1}`}</p>
                    <span className="text-xs font-bold text-green-600 shrink-0">
                      +{a.xp || 0} XP{a.bonus > 0 ? ` (+${a.bonus} โบนัส)` : ''}
                    </span>
                  </div>
                  <div className="text-sm text-quest-text/70 ml-7 space-y-0.5">
                    {a.correct ? (
                      <p>ตอบ {optText(a, a.selectedAnswer)} ถูกต้อง</p>
                    ) : (
                      <>
                        <p>ตอบ {optText(a, a.selectedAnswer)}</p>
                        <p>คำตอบที่ถูกคือ {optText(a, a.correctAnswer)}</p>
                        {expl ? <p className="mt-1 text-quest-text/60">💡 {expl}</p> : null}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentMePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-lavender-50 to-mint-50 flex items-center justify-center">
          <div className="text-6xl animate-bounce">🦊</div>
        </div>
      }
    >
      <Me />
    </Suspense>
  );
}
