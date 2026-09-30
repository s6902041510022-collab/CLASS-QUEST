'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TeacherHeader from '@/components/TeacherHeader';
import { getTeacherSession } from '@/lib/auth';

const AVATARS = ['🦊', '🐱', '🐶', '🐰', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸', '🐵', '🐔'];

export default function TeacherStudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🦊');
  const [bulk, setBulk] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  // ชื่อห้องเรียนใหม่
  const [newGroup, setNewGroup] = useState('');
  // แก้ไขในบรรทัด (ไม่ใช้ prompt — ตัดปัญหา error จากกล่องโต้ตอบ)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('🦊');
  const [editGroup, setEditGroup] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  // ค้นหาชื่อนักเรียน
  const [query, setQuery] = useState('');
  // กดโฟลเดอร์เพื่อกรอง: '' = ทั้งหมด, 'none' = ไม่มีห้อง, หรือ groupId
  const [filterGroup, setFilterGroup] = useState('');
  // เลือกหลายคนเพื่อย้ายเข้าห้องพร้อมกัน
  const [picked, setPicked] = useState<string[]>([]);
  const [bulkTarget, setBulkTarget] = useState('');

  useEffect(() => {
    getTeacherSession().then((session) => {
      if (!session) {
        router.replace('/teacher/login');
        return;
      }
      load();
    });
  }, [router]);

  const load = async () => {
    try {
      const [s, g] = await Promise.all([
        fetch('/api/students').then((x) => x.json()),
        fetch('/api/groups').then((x) => x.json()),
      ]);
      if (s.success) setStudents(s.data || []);
      if (g.success) setGroups(g.data || []);
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
    if (
      !confirm(
        `ลบ "${sname}" ออกจากรายชื่อ?\nคะแนนและประวัติการเล่นทั้งหมดของคนนี้จะถูกลบด้วย (ย้อนกลับไม่ได้)`
      )
    )
      return;
    await fetch(`/api/students/${id}`, { method: 'DELETE' });
    load();
  };

  // ===== ห้องเรียน (โฟลเดอร์) =====

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup.trim()) {
      setError('ใส่ชื่อห้องเรียนก่อน');
      return;
    }
    setError('');
    const r = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newGroup.trim() }),
    }).then((x) => x.json());
    if (r.success) {
      setNewGroup('');
      load();
    } else {
      setError(r.error || 'สร้างห้องเรียนไม่สำเร็จ');
    }
  };

  const removeGroup = async (id: string, gname: string) => {
    if (!confirm(`ลบห้องเรียน "${gname}"?\nนักเรียนในห้องจะกลับไป "ไม่มีห้องเรียน" (ชื่อยังอยู่)`)) return;
    await fetch(`/api/groups?id=${id}`, { method: 'DELETE' });
    load();
  };

  const assignGroup = async (id: string, groupId: string) => {
    await fetch(`/api/students/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId }),
    });
    load();
  };

  // ===== แก้ไขในบรรทัด =====

  const startEdit = (s: any) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditAvatar(s.avatar || '🦊');
    setEditGroup(s.groupId || '');
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) {
      setError('ชื่อห้ามว่าง');
      return;
    }
    setError('');
    await fetch(`/api/students/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), avatar: editAvatar, groupId: editGroup }),
    });
    setEditingId(null);
    load();
  };

  const groupById = new Map(groups.map((g: any) => [g.id, g]));
  const countIn = (gid: string) => students.filter((s: any) => (s.groupId || '') === gid).length;
  const unassigned = students.filter((s: any) => !s.groupId);

  // กรองตามคำค้น (ชื่อ + ห้อง) แล้วกรองตามโฟลเดอร์ที่เลือก
  const q = query.trim().toLowerCase();
  const matchQuery = (s: any) => !q || String(s.name).toLowerCase().includes(q);
  const inFilter = (s: any) =>
    filterGroup === '' ? true : filterGroup === 'none' ? !s.groupId : s.groupId === filterGroup;

  // ย้ายหลายคนเข้าห้องเดียวกัน
  const movePicked = async () => {
    if (picked.length === 0) return;
    const label =
      bulkTarget === '' ? 'ไม่มีห้องเรียน' : `📁 ${groupById.get(bulkTarget)?.name || ''}`;
    if (!confirm(`ย้าย ${picked.length} คน เข้า "${label}"?`)) return;
    await Promise.all(
      picked.map((id) =>
        fetch(`/api/students/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupId: bulkTarget }),
        })
      )
    );
    setPicked([]);
    load();
  };

  const togglePick = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // รายชื่อที่จะแสดงในการ์ของแต่ละห้อง (ตามตัวกรอง + คำค้น)
  const membersOf = (gid: string) => students.filter((s: any) => (s.groupId || '') === gid && matchQuery(s));
  const shownGroups = groups.filter((g: any) => filterGroup === '' || filterGroup === g.id);
  const showUnassigned = (filterGroup === '' || filterGroup === 'none') && unassigned.some(matchQuery);

  return (
    <div className="min-h-screen bg-gray-50">
      <TeacherHeader
        title="รายชื่อนักเรียน"
        subtitle={`${students.length} คน • ${groups.length} ห้องเรียน — นักเรียนจะเห็นรายชื่อนี้ตอนเข้าเกม`}
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

        {/* สร้างห้องเรียน (โฟลเดอร์) */}
        <form onSubmit={createGroup} className="card p-6">
          <h2 className="text-lg font-bold mb-1">🏫 สร้างห้องเรียน (โฟลเดอร์)</h2>
          <p className="text-sm text-quest-text/60 mb-4">
            ตั้งชื่อเอง เช่น &quot;ป.4/1&quot;, &quot;ห้อง A&quot; — เอาไว้แยกกลุ่มนักเรียน / จัดรายชื่อเป็นสัดส่วน
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              maxLength={30}
              value={newGroup}
              onChange={(e) => {
                setNewGroup(e.target.value);
                setError('');
              }}
              placeholder="ชื่อห้องเรียน เช่น ป.4/1"
              className="input flex-1"
            />
            <button
              type="submit"
              disabled={!newGroup.trim() || loading}
              className="btn-secondary whitespace-nowrap disabled:opacity-50"
            >
              📁 + สร้างห้อง
            </button>
          </div>
        </form>

        {/* แถบโฟลเดอร์ — กดเพื่อกรองรายชื่อ */}
        {groups.length > 0 && (
          <div className="card p-4">
            <p className="text-sm font-bold mb-3">📁 กดโฟลเดอร์เพื่อดูเฉพาะห้องนั้น</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterGroup('')}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  filterGroup === ''
                    ? 'bg-quest-sky text-white border-quest-sky font-bold'
                    : 'bg-white border-gray-200 text-quest-text/70 hover:bg-sky-50'
                }`}
              >
                👥 ทั้งหมด ({students.length})
              </button>
              {groups.map((g: any) => (
                <span
                  key={g.id}
                  className={`inline-flex items-center rounded-full border text-sm transition ${
                    filterGroup === g.id
                      ? 'bg-quest-sky text-white border-quest-sky font-bold'
                      : 'bg-white border-gray-200 text-quest-text/70'
                  }`}
                >
                  <button onClick={() => setFilterGroup(filterGroup === g.id ? '' : g.id)}>
                    📁 {g.name} ({countIn(g.id)})
                  </button>
                  <button
                    onClick={() => removeGroup(g.id, g.name)}
                    title={`ลบห้อง ${g.name}`}
                    className={`px-2 font-bold ${
                      filterGroup === g.id ? 'text-white/70 hover:text-white' : 'text-red-400 hover:text-red-600'
                    }`}
                  >
                    ✕
                  </button>
                </span>
              ))}
              {unassigned.length > 0 && (
                <button
                  onClick={() => setFilterGroup(filterGroup === 'none' ? '' : 'none')}
                  className={`px-3 py-1.5 rounded-full text-sm border transition ${
                    filterGroup === 'none'
                      ? 'bg-quest-sky text-white border-quest-sky font-bold'
                      : 'bg-white border-gray-200 text-quest-text/70 hover:bg-sky-50'
                  }`}
                >
                  📭 ไม่มีห้อง ({unassigned.length})
                </button>
              )}
            </div>
          </div>
        )}

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

        {/* ค้นหา + เลือกหลายคนย้ายห้อง */}
        {students.length > 0 && (
          <div className="card p-4 space-y-3">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔍 ค้นหาชื่อนักเรียน…"
              className="input w-full"
            />
            {picked.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-2 p-3 bg-sky-50 rounded-2xl">
                <span className="text-sm font-medium self-center">เลือกแล้ว {picked.length} คน</span>
                <select
                  value={bulkTarget}
                  onChange={(e) => setBulkTarget(e.target.value)}
                  className="input flex-1"
                >
                  <option value="">ไม่มีห้องเรียน</option>
                  {groups.map((g: any) => (
                    <option key={g.id} value={g.id}>
                      📁 {g.name}
                    </option>
                  ))}
                </select>
                <button onClick={movePicked} className="btn-primary whitespace-nowrap">
                  ย้ายทั้งหมด
                </button>
                <button onClick={() => setPicked([])} className="btn-secondary whitespace-nowrap">
                  ยกเลิก
                </button>
              </div>
            )}
          </div>
        )}

        {/* รายชื่อ แบ่งตามห้องเรียน */}
        <div className="space-y-4">
          {shownGroups.map((g: any) => {
            const members = membersOf(g.id);
            // ห้องว่าง: แสดงเฉพาะตอนครูกดเข้ามาดูห้องนั้น (ไม่ปุ่มรกทั้งหน้า)
            if (members.length === 0 && filterGroup !== g.id) return null;
            return (
              <div key={g.id} className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">📁 {g.name}</h2>
                  <span className="text-sm text-quest-text/60">{members.length} คน</span>
                </div>
                {members.length === 0 ? (
                  <p className="text-center text-quest-text/60 text-sm py-4">
                    ยังไม่มีนักเรียนในห้องนี้ — ติ๊กชื่อเด็กด้านล่าวแล้วกด &quot;ย้ายทั้งหมด&quot; เข้าห้องนี้ได้เลย
                  </p>
                ) : (
                  <StudentRows
                    students={members}
                    groupById={groupById}
                    editingId={editingId}
                    editName={editName}
                    editAvatar={editAvatar}
                    editGroup={editGroup}
                    setEditName={setEditName}
                    setEditAvatar={setEditAvatar}
                    setEditGroup={setEditGroup}
                    startEdit={startEdit}
                    saveEdit={saveEdit}
                    cancelEdit={() => setEditingId(null)}
                    assignGroup={assignGroup}
                    remove={remove}
                    picked={picked}
                    togglePick={togglePick}
                  />
                )}
              </div>
            );
          })}

          {showUnassigned && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">📭 ไม่มีห้องเรียน</h2>
                <span className="text-sm text-quest-text/60">{unassigned.filter(matchQuery).length} คน</span>
              </div>
              <StudentRows
                students={unassigned.filter(matchQuery)}
                groupById={groupById}
                editingId={editingId}
                editName={editName}
                editAvatar={editAvatar}
                editGroup={editGroup}
                setEditName={setEditName}
                setEditAvatar={setEditAvatar}
                setEditGroup={setEditGroup}
                startEdit={startEdit}
                saveEdit={saveEdit}
                cancelEdit={() => setEditingId(null)}
                assignGroup={assignGroup}
                remove={remove}
                picked={picked}
                togglePick={togglePick}
              />
            </div>
          )}

          {students.length === 0 && (
            <div className="card p-8 text-center">
              <div className="text-5xl mb-3">📋</div>
              <p className="text-quest-text/60 mb-1">ยังไม่มีรายชื่อนักเรียน</p>
              <p className="text-quest-text/60 text-sm">
                เพิ่มรายชื่อก่อน แล้วนักเรียนจะเห็นและกดชื่อตัวเองตอนเข้าเกม
              </p>
            </div>
          )}

          {students.length > 0 && !q && filterGroup === '' && groups.length === 0 && null}

          {students.length > 0 && filterGroup === 'none' && unassigned.length === 0 && (
            <div className="card p-6 text-center text-quest-text/60 text-sm">ทุกคนมีห้องเรียนแล้ว 🎉</div>
          )}

          {q && filterGroup === '' && !showUnassigned && shownGroups.every((g: any) => membersOf(g.id).length === 0) && (
            <div className="card p-6 text-center text-quest-text/60 text-sm">
              ไม่พบชื่อ &quot;{query}&quot; ในรายชื่อที่มีอยู่
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// แถวนักเรียน: แสดง / แก้ไขในบรรทัด / เลือกห้อง / ลบ
function StudentRows({
  students,
  groupById,
  editingId,
  editName,
  editAvatar,
  editGroup,
  setEditName,
  setEditAvatar,
  setEditGroup,
  startEdit,
  saveEdit,
  cancelEdit,
  assignGroup,
  remove,
  picked = [],
  togglePick,
}: any) {
  return (
    <div className="space-y-2">
      {students.map((s: any) => {
        const isEditing = editingId === s.id;
        if (isEditing) {
          return (
            <div
              key={s.id}
              className="flex items-center gap-3 p-3 bg-sky-50 rounded-2xl border border-sky-200 flex-wrap"
            >
              <select
                value={editAvatar}
                onChange={(e) => setEditAvatar(e.target.value)}
                className="input w-16 text-center text-xl"
              >
                {['🦊', '🐱', '🐶', '🐰', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸', '🐵', '🐔'].map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <input
                type="text"
                maxLength={30}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="input flex-1 min-w-[140px]"
              />
              <select
                value={editGroup}
                onChange={(e) => setEditGroup(e.target.value)}
                className="input w-auto"
              >
                <option value="">ไม่มีห้องเรียน</option>
                {[...groupById.values()].map((g: any) => (
                  <option key={g.id} value={g.id}>
                    📁 {g.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => saveEdit(s.id)} className="px-3 py-1.5 rounded-xl text-xs bg-quest-sky text-white">
                  💾 บันทึก
                </button>
                <button onClick={cancelEdit} className="px-3 py-1.5 rounded-xl text-xs bg-white hover:bg-gray-100 text-quest-text/70">
                  ยกเลิก
                </button>
              </div>
            </div>
          );
        }
        return (
          <div
            key={s.id}
            className={`flex items-center gap-3 p-3 rounded-2xl flex-wrap ${
              picked.includes(s.id) ? 'bg-sky-100 ring-2 ring-quest-sky' : 'bg-gray-50'
            }`}
          >
            {togglePick && (
              <input
                type="checkbox"
                checked={picked.includes(s.id)}
                onChange={() => togglePick(s.id)}
                className="w-4 h-4 shrink-0 cursor-pointer"
                title="เลือกเพื่อย้ายห้องหลายคนพร้อมกัน"
              />
            )}
            <span className="text-2xl shrink-0">{s.avatar}</span>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{s.name}</p>
              <p className="text-xs text-quest-text/60">
                {s.gamesPlayed > 0
                  ? `เล่นไป ${s.gamesPlayed} ครั้ง • ${s.totalXp || 0} XP • ถูก ${s.correctAnswers || 0}/${s.totalAnswers || 0}`
                  : 'ยังไม่ได้เล่น'}
              </p>
            </div>
            <select
              value={s.groupId || ''}
              onChange={(e) => assignGroup(s.id, e.target.value)}
              className="input w-auto text-sm"
              title="ย้ายห้องเรียน"
            >
              <option value="">ไม่มีห้อง</option>
              {[...groupById.values()].map((g: any) => (
                <option key={g.id} value={g.id}>
                  📁 {g.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => startEdit(s)}
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
        );
      })}
    </div>
  );
}


