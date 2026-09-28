'use client';

import Link from 'next/link';

// ปุ่มกลับหน้าหลักของนักเรียน (หน้าเข้าร่วม — เห็นห้องที่เล่นอยู่แล้ว)
export default function HomeButton() {
  return (
    <Link
      href="/student/join"
      title="กลับหน้าหลัก"
      className="shrink-0 text-2xl text-quest-text/60 hover:text-quest-sky transition-colors"
    >
      🏠
    </Link>
  );
}