'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MASCOT } from '@/lib/utils';
import { getTeacherSession, clearTeacherSession, forgetTeacherSession } from '@/lib/auth';

const AVATARS = ['👨‍🏫', '👩‍🏫', '🧑‍🏫', '🦊', '🐼', '🐨', '🦉', '🐧', '🌟', '🍀', '🎓', '✨'];

export default function TeacherSettingsPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('👨‍🏫');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [saved, setSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getTeacherSession().then((session) => {
      if (!session) {
        router.replace('/teacher/login');
        return;
      }
      setName(session.name);
      setUsername(session.username || '');
      setAvatar(session.avatar || '👨‍🏫');
    });
  }, [router]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('กรอกชื่อด้วยครับ');
      return;
    }
    setLoading(true);
    setError('');
    setSaved(false);
    try {
      const response = await fetch('/api/auth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), avatar }),
      });
      const result = await response.json();
      if (result.success) {
        // รีเฟรชแคชฝั่ง client ให้เห็นชื่อใหม่ทันที
        await getTeacherSession(true);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(result.error || 'บันทึกไม่สำเร็จ');
      }
    } catch {
      setError('บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSaved(false);

    if (!currentPassword) return setPasswordError('กรอกรหัสผ่านปัจจุบัน');
    if (newPassword.length < 6) return setPasswordError('รหัสผ่านใหม่ต้องยาวอย่างน้อย 6 ตัว');
    if (newPassword !== confirmPassword) {
      return setPasswordError('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน');
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await response.json();
      if (result.success) {
        // เซิร์ฟเวอร์ตัดเซสชันทุกเครื่องทิ้งแล้ว รวมถึงเครื่องนี้
        // ต้องลืนแคชฝั่ง client ด้วย ไม่งั้นหน้าล็อกอินจะเชื่อว่ายังล็อกอินอยู่
        // แล้วดันกลับไป dashboard ที่โหลดข้อมูลไม่ได้ (เจอตอนลองด้วยมือจริง)
        forgetTeacherSession();
        router.push('/teacher/login');
      } else {
        setPasswordError(result.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
      }
    } catch {
      setPasswordError('เปลี่ยนรหัสผ่านไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await clearTeacherSession();
    router.push('/teacher/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/teacher/dashboard" className="text-quest-text/60 hover:text-quest-sky">
            ←
          </Link>
          <span className="text-2xl">{MASCOT.emoji}</span>
          <h1 className="font-bold">ตั้งค่าบัญชีครู</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* โปรไฟล์ */}
        <form onSubmit={saveProfile} className="card p-6">
          <h2 className="text-lg font-bold mb-1">ข้อมูลของคุณ</h2>
          <p className="text-sm text-quest-text/60 mb-5">ชื่อนี้จะแสดงในหน้าเกมและหน้าสถิติ</p>

          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="w-24 h-24 rounded-3xl bg-sky-50 flex items-center justify-center text-5xl">
                {avatar}
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = AVATARS[(AVATARS.indexOf(avatar) + 1) % AVATARS.length];
                  setAvatar(next);
                }}
                className="text-xs text-quest-sky hover:underline"
              >
                เปลี่ยนรูป →
              </button>
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">ชื่อครู</label>
                <input
                  type="text"
                  maxLength={30}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError('');
                    setSaved(false);
                  }}
                  className="input"
                />
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">ชื่อผู้ใช้ (เข้าสู่ระบบ)</label>
                <input type="text" value={username} readOnly className="input bg-gray-50" />
                <p className="text-xs text-quest-text/50 mt-1">
                  เปลี่ยนไม่ได้ เพื่อไม่ให้สับสนตอนเข้าสู่ระบบ
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="btn-primary disabled:opacity-50"
                >
                  {loading ? 'กำลังบันทึก...' : saved ? 'บันทึกแล้ว ✓' : 'บันทึก'}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* รหัสผ่าน */}
        <form onSubmit={changePassword} className="card p-6">
          <h2 className="text-lg font-bold mb-1">เปลี่ยนรหัสผ่าน</h2>
          <p className="text-sm text-quest-text/60 mb-5">
            เปลี่ยนแล้วจะออกจากระบบทุกเครื่องทันที — กรุณาจำรหัสใหม่ไว้ด้วย เพราะถ้าลืมต้องสมัครบัญชีใหม่
          </p>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">รหัสผ่านปัจจุบัน</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setPasswordError('');
                }}
                className="input text-center"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">รหัสผ่านใหม่</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordError('');
                }}
                className="input text-center"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">ยืนยันรหัสผ่านใหม่</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordError('');
                }}
                className="input text-center"
              />
            </div>
          </div>

          {passwordError && <p className="text-red-500 text-sm mt-3">{passwordError}</p>}

          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            className="btn-primary mt-4 disabled:opacity-50"
          >
            {loading ? 'กำลังเปลี่ยน...' : 'เปลี่ยนรหัสผ่าน'}
          </button>
        </form>

        {/* ออกจากระบบ */}
        <div className="card p-6">
          <h2 className="text-lg font-bold mb-1">ออกจากระบบ</h2>
          <p className="text-sm text-quest-text/60 mb-4">
            ข้อมูลเกมและผลการเล่นทั้งหมดจะยังอยู่ครบ ไม่หายครับ
          </p>
          <button onClick={handleLogout} className="btn-secondary">
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
}
