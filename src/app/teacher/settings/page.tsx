'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MASCOT } from '@/lib/utils';
import { getTeacherSession, setTeacherSession, clearTeacherSession } from '@/lib/auth';

const AVATARS = ['👨‍🏫', '👩‍🏫', '🧑‍🏫', '🦊', '🐼', '🐨', '🦉', '🐧', '🌟', '🍀', '🎓', '✨'];

export default function TeacherSettingsPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('👨‍🏫');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [saved, setSaved] = useState(false);
  const [pinSaved, setPinSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const session = getTeacherSession();
    if (!session) {
      router.replace('/teacher/login');
      return;
    }
    setName(session.name);
    setAvatar(session.avatar || '👨‍🏫');
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
        setTeacherSession(name.trim(), avatar);
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

  const changePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setPinSaved(false);

    if (!currentPin) {
      setPinError('กรอก PIN ปัจจุบัน');
      return;
    }
    if (newPin.length < 4) {
      setPinError('PIN ใหม่ต้องมีอย่างน้อย 4 หลัก');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('PIN ใหม่ทั้งสองช่องไม่ตรงกัน');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin, newPin }),
      });
      const result = await response.json();
      if (result.success) {
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
        setPinSaved(true);
        setTimeout(() => setPinSaved(false), 2500);
      } else {
        setPinError(result.error || 'เปลี่ยน PIN ไม่สำเร็จ');
      }
    } catch {
      setPinError('เปลี่ยน PIN ไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearTeacherSession();
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

        {/* PIN */}
        <form onSubmit={changePin} className="card p-6">
          <h2 className="text-lg font-bold mb-1">เปลี่ยน PIN</h2>
          {/* เคยเขียนบอกค่า PIN ปัจจุบันไว้ตรงนี้
              แต่หน้านี้เปิดได้จากเบราว์เซอร์ ไม่ต้องล็อกอิน จึงเป็นการเปิดเผยรหัสผ่านให้คนอื่น
              ถ้าครูเปลี่ยน PIN แล้วค่าที่เขียนไว้ก็ยังเป็นค่าเก่า ทำให้เข้าใจผิดว่าเปลี่ยนไม่ได้ */}
          <p className="text-sm text-quest-text/60 mb-5">
            PIN ใช้เข้าสู่ระบบฝั่งครู ถ้าลืม ต้องตั้งใหม่ผ่านหน้าสถานะระบบ
          </p>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">PIN ปัจจุบัน</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={currentPin}
                onChange={(e) => {
                  setCurrentPin(e.target.value.replace(/\D/g, ''));
                  setPinError('');
                  setPinSaved(false);
                }}
                className="input text-center"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">PIN ใหม่</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={newPin}
                onChange={(e) => {
                  setNewPin(e.target.value.replace(/\D/g, ''));
                  setPinError('');
                  setPinSaved(false);
                }}
                className="input text-center"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">ยืนยัน PIN ใหม่</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => {
                  setConfirmPin(e.target.value.replace(/\D/g, ''));
                  setPinError('');
                  setPinSaved(false);
                }}
                className="input text-center"
              />
            </div>
          </div>

          {pinError && <p className="text-red-500 text-sm mt-3">{pinError}</p>}

          <button
            type="submit"
            disabled={loading || !newPin || !confirmPin}
            className="btn-primary mt-4 disabled:opacity-50"
          >
            {pinSaved ? 'เปลี่ยน PIN แล้ว ✓' : 'เปลี่ยน PIN'}
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
