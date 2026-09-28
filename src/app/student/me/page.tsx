'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MASCOT } from '@/lib/utils';

function Me() {
  const sp = useSearchParams();
  const gameId = sp.get('gameId') || '';
  const studentId = sp.get('studentId') || '';

  const [student, setStudent] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'summary' | 'detail' | 'history'>(
    gameId ? 'detail' : 'summary'
  );
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    if (!studentId) return;
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
                      {h.gameName} — {new Date(h.joinedAt).toLocaleDateString('th-TH')}
                    </option>
                  ))}
                </select>
              )}
              {selected ? <RoundDetail round={selected} /> : null}
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

// แสดงรายละเอียดรอบเดียว: ถูก/ผิด ข้อไหน + เหตุผล
function RoundDetail({ round }: { round: any }) {
  const acc = round.total > 0 ? Math.round((round.correct / round.total) * 100) : 0;
  return (
    <div className="space-y-3">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">{round.gameName}</h2>
          <span className="text-quest-text/60 text-sm">
            {new Date(round.joinedAt).toLocaleDateString('th-TH')}
          </span>
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

      {(round.answers || []).length === 0 ? (
        <div className="card p-6 text-center text-quest-text/60 text-sm">
          ยังไม่ได้ตอบคำถามในรอบนี้
        </div>
      ) : (
        round.answers.map((a: any, i: number) => (
          <div
            key={i}
            className={`card p-4 ${a.correct ? 'bg-green-50/50' : 'bg-red-50/50'}`}
          >
            <div className="flex items-start gap-2 mb-2">
              <span className="text-lg">{a.correct ? '✅' : '❌'}</span>
              <p className="font-medium flex-1">{a.questionText || `คำถามที่ ${i + 1}`}</p>
              {a.xp > 0 && (
                <span className="text-xs font-bold text-green-600 shrink-0">+{a.xp} XP</span>
              )}
            </div>
            {!a.correct && (
              <p className="text-sm text-quest-text/60 ml-7">
                คุณเลือกข้อ {String.fromCharCode(65 + a.selectedAnswer)}
                {' · '}คำตอบที่ถูกคือ ข้อ {a.correctAnswer}
              </p>
            )}
          </div>
        ))
      )}
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
