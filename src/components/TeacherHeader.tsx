'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { MASCOT } from '@/lib/utils';
import { getTeacherSession, clearTeacherSession } from '@/lib/auth';

type Props = {
  title: string;
  subtitle?: string;
  backHref?: string;
};

export default function TeacherHeader({ title, subtitle, backHref }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [teacher, setTeacher] = useState<{ name: string; avatar: string } | null>(null);

  useEffect(() => {
    getTeacherSession().then(setTeacher);
  }, []);

  const handleLogout = async () => {
    await clearTeacherSession();
    router.push('/teacher/login');
  };

  return (
    <header className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {pathname !== '/teacher/dashboard' ? (
              <Link
                href="/teacher/dashboard"
                title="กลับหน้าหลักครู"
                className="shrink-0 text-quest-text/60 hover:text-quest-sky text-xl"
              >
                🏠
              </Link>
            ) : null}
            {backHref ? (
              <Link
                href={backHref}
                className="shrink-0 text-quest-text/60 hover:text-quest-sky text-sm"
              >
                ←
              </Link>
            ) : null}
            <span className="text-3xl shrink-0">{MASCOT.emoji}</span>
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight truncate">{title}</h1>
              {subtitle ? (
                <p className="text-sm text-quest-text/60 truncate">{subtitle}</p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/teacher/settings"
              className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-2xl hover:bg-sky-50 transition-colors"
              title="ตั้งค่าบัญชีครู"
            >
              <span className="text-2xl">{teacher?.avatar || '👨‍🏫'}</span>
              <div className="text-left hidden md:block">
                <p className="text-sm font-medium leading-tight">
                  {teacher?.name || 'ครู'}
                </p>
                <p className="text-xs text-quest-text/60">Game Master</p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              title="ออกจากระบบ"
              className="px-3 py-2 rounded-2xl bg-gray-100 text-quest-text hover:bg-gray-200 text-sm font-medium transition-colors"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
