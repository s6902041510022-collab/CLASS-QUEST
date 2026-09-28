'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TeacherHeader from '@/components/TeacherHeader';
import { getTeacherSession } from '@/lib/auth';

const AVATARS = ['🦊', '🐱', '🐶', '🐰', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸', '🐵', '🐔'];

export default function TeacherStudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🦊');
  const [bulk, setBulk] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!getTeacherSession()) {
      router.replace('/teacher/login');
      return;
    }
    load();
  }, [router]);

  const load = async () => {
    try {
      const r = await fetch('/api/students').then((x) => x.json());
      if (r.success) setStudents(r.data || []);
    } catch {
      /* ไม่ critical */
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('กรอกชื่อนักเรียน');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), avatar }),
      }).then((x) => x.json());
      if (r.success) {
        setName('');
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        load();
      } else {
        setError(r.error || 'เพิ่มไม่สำเร็จ');
      }
    } catch {
      setError('เพิ่มไม่สำเร็จ ลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  const addBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    const names = bulk
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length === 0) {
      setError('ใส่รายชื่ออย่างน้อย 1 คน');
      return;
    }
    setLoading(true);
    try {
      const r = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names }),
      }).then((x) => x.json());
      if (r.success) {
        setBulk('');
        setShowBulk(false);
        setError('');
        load();
      } else {
        setError(r.error || 'เพิ่มไม่สำเร็จ');
      }
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string, sname: string) => {
    if (!confirm(`ลบ "${sname}" ออกจากรายชื่อ?\nผลการเล่นที่เคยบันทึกไว้จะยังอยู่`)) return;
    await fetch(`/api/students/${id}`, { method: 'DELETE' });
    load();
  };

  const rename = async (id: string, current: string) => {
    const next = prompt('แก้ไขชื่อนักเรียน', current);
    if (!next || !next.trim() || next === current) return;
    await fetch(`/api/students/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: next.trim() }),
    });
    load();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TeacherHeader
        title="รายชื่อนักเรียน"
        subtitle={`${students.length} คน — นักเรียนจะเห็นรายชื่อนี้ตอนเข้าเกม`}
        backHref="/teacher/dashboard"
      />

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* เพิ่มทีละคน */}
        <form onSubmit={add} className="card p-6">
          <h2 className="text-lg font-bold mb-4">เพิ่มนักเรียน</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              maxLength={30}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="ชื่อ-นามสกุล เช่น เด็กชายสมชาย"
              className="input flex-1"
            />
            <div className="flex gap-2">
              <select
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                className="input w-20 text-center text-2xl"
              >
                {AVATARS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!name.trim() || loading}
                className="btn-primary disabled:opacity-50 whitespace-nowrap"
              >
                {saved ? 'เพิ่มแล้ว ✓' : '+ เพิ่ม'}
              </button>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </form>

        {/* เพิ่มเป็นชุด */}
        {showBulk ? (
          <form onSubmit={addBulk} className="card p-6">
            <h2 className="text-lg font-bold mb-1">เพิ่มหลายคนพร้อมกัน</h2>
            <p className="text-sm text-quest-text/60 mb-4">
              พิมพ์ชื่อทีละบรรทัด (หรือคั่นด้วยเครื่องหมายจุลภาค) แล้วกดเพิ่ม
            </p>
            <textarea
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              rows={8}
              placeholder={'เด็กชายสมชาย\nเด็กหญิงสุดา\nเด็กชายประยุทธ'}
              className="input font-mono text-sm"
            />
            <div className="flex gap-3 mt-3">
              <button
                type="button"
                onClick={() => setShowBulk(false)}
                className="btn-secondary flex-1"
              >
                ยกเลิก
              </button>
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                เพิ่มทั้งหมด
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowBulk(true)} className="btn-secondary w-full">
            📋 เพิ่มรายชื่อทีละชุด (วางรายชื่อทั้งห้อง)
          </button>
        )}

        {/* รายชื่อ */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">รายชื่อทั้งหมด</h2>
            <span className="text-sm text-quest-text/60">{students.length} คน</span>
          </div>

          {students.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-5xl mb-3">📋</div>
              <p className="text-quest-text/60 mb-1">ยังไม่มีรายชื่อนักเรียน</p>
              <p className="text-quest-text/60 text-sm">
                เพิ่มรายชื่อก่อน แล้วนักเรียนจะเห็นและกดชื่อตัวเองตอนเข้าเกม
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {students.map((s, i) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl"
                >
                  <span className="text-xs font-bold text-quest-text/30 w-5 shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-2xl shrink-0">{s.avatar}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{s.name}</p>
                    <p className="text-xs text-quest-text/60">
                      {s.gamesPlayed > 0
                        ? `เล่นไป ${s.gamesPlayed} ครั้ง • ${s.totalXp || 0} XP • ถูก ${s.correctAnswers || 0}/${s.totalAnswers || 0}`
                        : 'ยังไม่ได้เล่น'}
                    </p>
                  </div>
                  <button
                    onClick={() => rename(s.id, s.name)}
                    className="px-2 py-1 rounded-xl text-xs bg-white hover:bg-sky-50 text-quest-text/70 shrink-0"
                  >
                    แก้
                  </button>
                  <button
                    onClick={() => remove(s.id, s.name)}
                    className="px-2 py-1 rounded-xl text-xs bg-white hover:bg-red-50 text-red-500 shrink-0"
                  >
                    ลบ
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
