'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import TeacherHeader from '@/components/TeacherHeader';
import { getTeacherSession } from '@/lib/auth';

function Analytics() {
  const router = useRouter();
  const sp = useSearchParams();
  const gameId = sp.get('gameId') || '';

  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<'students' | 'questions' | 'games'>('students');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!getTeacherSession()) {
      router.replace('/teacher/login');
      return;
    }
    // เปลี่ยนเกม → เคลียร์ข้อมูลเก่า (ภาพรวมกับรายเกมมีโครงสร้างต่างกัน
    // ถ้าใช้ของเดิมค้างอยู่ GameAnalytics จะอ่าน totals ไม่เจอแล้ว crash)
    let cancelled = false;
    setData(null);
    setLoadError('');
    fetch(`/api/analytics${gameId ? `?gameId=${gameId}` : ''}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.success) setData(j.data);
        else setLoadError(j.error || 'โหลดข้อมูลไม่สำเร็จ');
      })
      .catch(() => {
        if (!cancelled) setLoadError('โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง');
      });
    return () => {
      cancelled = true;
    };
  }, [gameId, router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <TeacherHeader
        title="ผลการวิเคราะห์"
        subtitle={gameId ? data?.game?.name : 'ภาพรวมทุกเกม'}
        backHref="/teacher/dashboard"
      />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {gameId && (
          <div className="mb-4 flex items-center justify-between">
            <Link href="/teacher/analytics" className="text-sm text-quest-sky hover:underline">
              ← ดูภาพรวมทุกเกม
            </Link>
            <Link href={`/teacher/students`} className="text-sm text-quest-text/60 hover:text-quest-sky">
              จัดการรายชื่อ →
            </Link>
          </div>
        )}

        {!data ? (
          <div className="card p-10 text-center text-quest-text/60">
            {loadError || 'กำลังโหลดข้อมูล...'}
          </div>
        ) : gameId ? (
          <GameAnalytics data={data} tab={tab} setTab={setTab} />
        ) : (
          <OverviewAnalytics data={data} tab={tab} setTab={setTab} />
        )}
      </div>
    </div>
  );
}

// ---------- ภาพรวมทุกเกม ----------
function OverviewAnalytics({ data, tab, setTab }: any) {
  return (
    <>
      <div className="flex gap-2 mb-5">
        {(
          [
            ['games', '🎮 รายเกม'],
            ['students', '👥 รายนักเรียน'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 p-3 rounded-2xl font-medium text-sm ${
              tab === k ? 'bg-quest-sky text-white' : 'bg-white text-quest-text/70'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'games' ? (
        <div className="space-y-2">
          {(data.games || []).length === 0 ? (
            <div className="card p-10 text-center text-quest-text/60">ยังไม่มีเกม</div>
          ) : (
            data.games.map((g: any) => (
              <Link
                key={g.id}
                href={`/teacher/analytics?gameId=${g.id}`}
                className="card p-4 flex items-center gap-4 hover:shadow-card transition-shadow"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{g.name}</p>
                  <p className="text-xs text-quest-text/60">
                    {g.subject} • {g.students} คน • เล่น {g.plays} ครั้ง
                  </p>
                </div>
                <div className="text-center shrink-0">
                  <p className="font-bold text-quest-sky">{g.accuracy}%</p>
                  <p className="text-xs text-quest-text/60">แม่นยำ</p>
                </div>
                <span className="text-quest-text/30">›</span>
              </Link>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {(data.students || []).length === 0 ? (
            <div className="card p-10 text-center text-quest-text/60">ยังไม่มีนักเรียนในระบบ</div>
          ) : (
            data.students.map((s: any) => (
              <Link
                key={s.id}
                href={`/teacher/student/${s.id}`}
                className="card p-4 flex items-center gap-4 hover:shadow-card transition-shadow"
              >
                <span className="text-2xl shrink-0">{s.avatar}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{s.name}</p>
                  <p className="text-xs text-quest-text/60">
                    เล่น {s.gamesPlayed} ครั้ง • แม่นยำ {s.accuracy}%
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-quest-sky">{s.totalXp} XP</p>
                  <p className="text-xs text-quest-text/60">{s.accuracy}% แม่นยำ</p>
                </div>
                <span className="text-quest-text/30">›</span>
              </Link>
            ))
          )}
        </div>
      )}
    </>
  );
}

// ---------- วิเคราะห์รายเกม ----------
function GameAnalytics({ data, tab, setTab }: any) {
  // กันข้อมูลยังไม่พร้อม (ผ่าน transition หรือเกมไม่มีรอบเล่น) — ไม่ crash
  const t = data?.totals;
  if (!t) return null;
  return (
    <>
      <div className="card p-5 mb-5">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          {[
            ['👥', t.players, 'คนเล่น'],
            ['🎯', `${t.accuracy}%`, 'ความแม่นยำ'],
            ['✅', t.correct, 'ตอบถูก'],
            ['📝', t.answers, 'คำตอบรวม'],
            ['⭐', t.xp, 'XP รวม'],
          ].map(([icon, val, label]) => (
            <div key={label as string} className="p-3 bg-gray-50 rounded-2xl">
              <p className="text-xs text-quest-text/60">{icon as string}</p>
              <p className="text-xl font-bold">{val as string | number}</p>
              <p className="text-xs text-quest-text/60">{label as string}</p>
            </div>
          ))}
        </div>
        {(data.sessions || 0) > 0 && (
          <p className="text-xs text-quest-text/60 text-center mt-3">
            เล่นไปแล้ว {data.sessions} รอบ
          </p>
        )}
      </div>

      <div className="flex gap-2 mb-5">
        {(
          [
            ['students', '👥 ผลรายคน'],
            ['questions', '❓ ผลรายข้อ'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 p-3 rounded-2xl font-medium text-sm ${
              tab === k ? 'bg-quest-sky text-white' : 'bg-white text-quest-text/70'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'students' ? (
        (data.students || []).length === 0 ? (
          <div className="card p-10 text-center text-quest-text/60">
            ยังไม่มีนักเรียนเล่นเกมนี้
          </div>
        ) : (
          <div className="space-y-2">
            {data.students.map((s: any, i: number) => (
              <Link
                key={s.id}
                href={`/teacher/student/${s.id}?gameId=${data.game?.id}`}
                className="card p-4 flex items-center gap-3 hover:shadow-card transition-shadow"
              >
                <span
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                    i === 0
                      ? 'bg-yellow-100 text-yellow-700'
                      : i === 1
                        ? 'bg-gray-200 text-gray-600'
                        : i === 2
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-white text-quest-text/40'
                  }`}
                >
                  {i + 1}
                </span>
                <span className="text-2xl shrink-0">{s.avatar}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{s.name}</p>
                  <p className="text-xs text-quest-text/60">
                    ตอบถูก {s.correct}/{s.total} ข้อ • เล่น {s.rounds} รอบ
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-quest-sky">{s.xp} XP</p>
                  <p className="text-xs text-quest-text/60">{s.accuracy}%</p>
                </div>
                <span className="text-quest-text/30">›</span>
              </Link>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-3">
          {(data.questions || []).map((q: any, i: number) => (
            <div key={q.questionId} className="card p-5">
              <div className="flex items-start gap-2 mb-3">
                <span className="text-xs font-bold text-quest-text/30 shrink-0">#{i + 1}</span>
                <p className="font-medium flex-1">{q.text}</p>
                <span
                  className={`text-sm font-bold shrink-0 ${
                    q.accuracy >= 70
                      ? 'text-green-600'
                      : q.accuracy >= 40
                        ? 'text-orange-500'
                        : 'text-red-500'
                  }`}
                >
                  {q.accuracy}%
                </span>
              </div>
              <p className="text-xs text-quest-text/60 mb-2">
                {q.missionTitle} • ตอบแล้ว {q.answered} ครั้ง • ถูก {q.correct} ครั้ง
                {q.correctLabel ? <> • เฉลย: {q.correctLabel}</> : null}
              </p>
              <div className="space-y-1.5">
                {(q.optionTally || []).map((o: any) => {
                  const pct =
                    q.answered > 0 ? Math.round((o.count / q.answered) * 100) : 0;
                  const isCorrect = o.index === q.correctAnswer;
                  return (
                    <div key={o.index} className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          isCorrect ? 'bg-green-500 text-white' : 'bg-gray-100 text-quest-text/50'
                        }`}
                      >
                        {String.fromCharCode(65 + o.index)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="truncate">{q.options[o.index]}</span>
                          <span className="text-quest-text/60 shrink-0 ml-2">
                            {o.count} คน ({pct}%)
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isCorrect ? 'bg-green-400' : 'bg-orange-300'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* ชนิดอื่น (กรอกตัวเลข/จับคู่) — ไม่มีตัวเลือกให้นับ จึงสรุปเป็นคำตอบที่พบบ่อย */}
                {(q.answerTally || []).map((o: any) => {
                  const pct = q.answered > 0 ? Math.round((o.count / q.answered) * 100) : 0;
                  return (
                    <div key={o.label} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 bg-gray-100 text-quest-text/50">
                        •
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="truncate">{o.label}</span>
                          <span className="text-quest-text/60 shrink-0 ml-2">
                            {o.count} คน ({pct}%)
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-orange-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function TeacherAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-5xl animate-bounce">📊</div>
        </div>
      }
    >
      <Analytics />
    </Suspense>
  );
}
