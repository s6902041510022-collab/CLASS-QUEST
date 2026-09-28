'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TeacherLoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple PIN check (in production, use proper auth)
    if (pin === '1234') {
      router.push('/teacher/dashboard');
    } else {
      setError('รหัส PIN ไม่ถูกต้อง');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-lavender-50 to-mint-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">👨‍🏫</div>
          <h1 className="text-2xl font-bold mb-2">เข้าสู่ระบบครู</h1>
          <p className="text-quest-text/60">กรอก PIN เพื่อเข้าสู่ระบบ</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">PIN</label>
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError('');
              }}
              placeholder="กรอก PIN 4-6 หลัก"
              className="input text-center text-2xl tracking-widest"
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
            )}
          </div>

          <button type="submit" className="btn-primary w-full">
            เข้าสู่ระบบ
          </button>
        </form>

        {/* Demo PIN */}
        <div className="mt-6 p-4 bg-sky-50 rounded-2xl text-center">
          <p className="text-sm text-quest-text/60 mb-1">สำหรับทดสอบ</p>
          <p className="text-lg font-bold text-quest-sky">PIN: 1234</p>
        </div>

        {/* Back */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-quest-text/60 hover:text-quest-sky">
            ← กลับหน้าแรก
          </Link>
        </div>
      </div>
    </div>
  );
}
