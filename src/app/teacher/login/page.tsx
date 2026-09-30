'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getTeacherSession } from '@/lib/auth';

const AVATARS = ['👨‍🏫', '👩‍🏫', '🧑‍🏫', '🦊', '🐼', '🐨', '🦉', '🐧', '🌟', '🍀', '🎓', '✨'];

type Mode = 'login' | 'register';

export default function TeacherLoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('👨‍🏫');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // ถ้าเข้าสู่ระบบไว้แล้ว → ไปหน้า dashboard เลย
  useEffect(() => {
    getTeacherSession().then((session) => {
      if (session) router.replace('/teacher/dashboard');
    });
  }, [router]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setNotice('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!username.trim()) return setError('กรอกชื่อผู้ใช้ครับ');
    if (!password) return setError('กรอกรหัสผ่านครับ');
    if (mode === 'register' && !name.trim()) return setError('กรอกชื่อที่จะแสดงในเกมครับ');

    setLoading(true);
    try {
      const response = await fetch(
        mode === 'login' ? '/api/auth/login' : '/api/auth/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            mode === 'login'
              ? { username, password }
              : { username, password, name: name.trim(), avatar }
          ),
        }
      );
      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'ทำรายการไม่สำเร็จ');
        return;
      }

      // คนแรกที่สมัครได้รับของเดิมในระบบไปด้วย (เกมที่ทำไว้ตอนใช้รหัสเดิม)
      if (result.isFirstTeacher) {
        setNotice('บัญชีแรกของระบบ — เกมและรายชื่อที่มีอยู่เดิมถูกย้ายมาให้คุณแล้ว');
      }

      // รีเฟรชแคชสถานะก่อน ไม่งั้นหน้าถัดไปจะเจอค่า "ไม่ได้ล็อกอิน" ที่หน้านี้แคชไว้ตอนเปิด
      // แล้วดันเรากลับมาหน้าล็อกอินวนไม่จบ (เจอตอนลองด้วยมือจริง)
      await getTeacherSession(true);

      router.push('/teacher/dashboard');
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-lavender-50 to-mint-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">👨‍🏫</div>
          <h1 className="text-2xl font-bold mb-2">
            {mode === 'login' ? 'เข้าสู่ระบบครู' : 'สมัครบัญชีครู'}
          </h1>
          <p className="text-quest-text/60">
            {mode === 'login'
              ? 'กรอกชื่อผู้ใช้และรหัสผ่านของคุณ'
              : 'สร้างบัญชีของตัวเอง — เห็นเฉพาะเกมของตัวเอง'}
          </p>
        </div>

        {/* สลับเข้า/สมัคร — ครูใหม่ไม่ต้องเดาเส้นทาง */}
        <div className="flex gap-2 mb-6 bg-gray-100 rounded-2xl p-1">
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`flex-1 py-2 rounded-xl font-medium transition-all ${
                mode === m ? 'bg-white shadow-sm text-quest-sky' : 'text-quest-text/60'
              }`}
            >
              {m === 'login' ? 'เข้าสู่ระบบ' : 'สมัครบัญชีใหม่'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">ชื่อผู้ใช้</label>
            <input
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder="ตัวอักษรอังกฤษ ตัวเลข และ _ . -"
              className="input"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">รหัสผ่าน</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder={mode === 'register' ? 'อย่างน้อย 6 ตัว' : 'รหัสผ่านของคุณ'}
              className="input"
            />
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">ชื่อที่จะแสดงในเกม</label>
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
                />
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
            </>
          )}

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {notice && <p className="text-emerald-600 text-sm text-center">{notice}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading
              ? 'กำลังบันทึก...'
              : mode === 'login'
                ? 'เข้าสู่ระบบ'
                : 'สมัครและเริ่มใช้งาน'}
          </button>
        </form>

        <p className="mt-6 text-sm text-quest-text/60 text-center leading-relaxed">
          สมัครได้เลยหลายคน — แต่ละบัญชีเห็นแค่เกมและรายชื่อนักเรียนของตัวเอง
        </p>

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
