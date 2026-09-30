'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { setTeacherSession, getTeacherSession } from '@/lib/auth';

const AVATARS = ['👨‍🏫', '👩‍🏫', '🧑‍🏫', '🦊', '🐼', '🐨', '🦉', '🐧', '🌟', '🍀', '🎓', '✨'];

export default function TeacherLoginPage() {
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('👨‍🏫');
  const [step, setStep] = useState<'pin' | 'name'>('pin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // ถ้าเข้าสู่ระบบไว้แล้ว → ไปหน้า dashboard เลย
  useEffect(() => {
    const session = getTeacherSession();
    if (session) router.replace('/teacher/dashboard');
  }, [router]);

  const handlePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) {
      setError('กรอก PIN ก่อนครับ');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'รหัส PIN ไม่ถูกต้อง');
        return;
      }
      if (result.needsName) {
        setStep('name');
        return;
      }
      setTeacherSession(result.data.name, result.data.avatar);
      router.push('/teacher/dashboard');
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const handleName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('กรอกชื่อครูด้วยครับ');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), avatar }),
      });
      const result = await response.json();
      if (result.success) {
        setTeacherSession(name.trim(), avatar);
        router.push('/teacher/dashboard');
      } else {
        setError(result.error || 'บันทึกชื่อไม่สำเร็จ');
      }
    } catch {
      setError('บันทึกชื่อไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-lavender-50 to-mint-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">{step === 'pin' ? '👨‍🏫' : avatar}</div>
          <h1 className="text-2xl font-bold mb-2">
            {step === 'pin' ? 'เข้าสู่ระบบครู' : 'ตั้งชื่อของคุณ'}
          </h1>
          <p className="text-quest-text/60">
            {step === 'pin' ? 'กรอก PIN เพื่อเข้าสู่ระบบ' : 'ชื่อนี้จะแสดงในเกมและหน้าสถิติ'}
          </p>
        </div>

        {step === 'pin' ? (
          <form onSubmit={handlePin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ''));
                  setError('');
                }}
                placeholder="กรอก PIN 4 หลัก"
                className="input text-center text-2xl tracking-widest"
                autoFocus
              />
              {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading || pin.length < 4}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? 'กำลังตรวจสอบ...' : 'ถัดไป'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleName} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">ชื่อครู</label>
              <input
                type="text"
                maxLength={30}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                placeholder="เช่น ครูสมชาย"
                className="input"
                autoFocus
              />
              {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">เลือกรูป</label>
              <div className="grid grid-cols-6 gap-2">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAvatar(a)}
                    className={`w-12 h-12 rounded-2xl text-2xl flex items-center justify-center transition-all ${
                      avatar === a
                        ? 'bg-quest-sky ring-2 ring-quest-sky scale-110'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep('pin');
                  setError('');
                }}
                className="btn-secondary flex-1"
              >
                ← ย้อนกลับ
              </button>
              <button
                type="submit"
                disabled={!name.trim() || loading}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {loading ? 'กำลังบันทึก...' : 'เริ่มใช้งาน'}
              </button>
            </div>
          </form>
        )}

        {step === 'pin' && (
          <div className="mt-6 p-4 bg-sky-50 rounded-2xl text-center">
            <p className="text-sm text-quest-text/60 mb-1">สำหรับทดสอบ</p>
            <p className="text-lg font-bold text-quest-sky">PIN: 1234</p>
          </div>
        )}

        {/* ล็อกอินไม่ได้บ่อยครั้งเพราะระบบเขียนฐานข้อมูลไม่ได้
            (เช่น deploy บน Vercel ที่ filesystem เป็น read-only)
            ให้ทางไปหน้าที่บอกสาเหตุ + วิธีแก้ ไม่ใช่ให้ครูเดาทีละอย่าง */}
        <div className="mt-4 text-center">
          <Link href="/setup" className="text-sm text-quest-text/50 underline hover:text-quest-sky">
            ล็อกอินไม่ได้? ดูสถานะระบบและวิธีแก้
          </Link>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-quest-text/60 hover:text-quest-sky">
            ← กลับหน้าแรก
          </Link>
        </div>
      </div>
    </div>
  );
}
