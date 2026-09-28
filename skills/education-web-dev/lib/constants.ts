import { NavItem } from '@/types';

export const SITE_CONFIG = {
  name: 'EduLearn',
  description: 'แพลตฟอร์มการเรียนรู้ออนไลน์ที่ทำให้การศึกษาเป็นเรื่องสนุก',
  url: 'https://edulearn.vercel.app',
  locale: 'th-TH',
};

export const NAV_ITEMS: NavItem[] = [
  { label: 'หน้าแรก', href: '/' },
  { label: 'คอร์สเรียน', href: '/courses' },
  { label: 'แดชบอร์ด', href: '/dashboard' },
  { label: 'เกี่ยวกับเรา', href: '/about' },
];

export const COURSE_LEVELS = {
  beginner: { label: 'เริ่มต้น', color: 'accent' },
  intermediate: { label: 'ระดับกลาง', color: 'secondary' },
  advanced: { label: 'ระดับสูง', color: 'warm' },
} as const;

export const LESSON_TYPES = {
  video: { label: 'วิดีโอ', icon: '🎬' },
  text: { label: 'บทความ', icon: '📄' },
  quiz: { label: 'แบบทดสอบ', icon: '❓' },
  assignment: { label: 'การบ้าน', icon: '📝' },
} as const;

export const ACHIEVEMENTS = [
  { id: 'first-lesson', title: 'เริ่มต้นการเดินทาง', description: 'จบบทเรียนแรก', icon: '🎯' },
  { id: 'week-streak', title: '7 วันติดต่อกัน', description: 'เรียนต่อเนื่อง 7 วัน', icon: '🔥' },
  { id: 'course-complete', title: 'จบคอร์สแรก', description: 'จบคอร์สเรียนแรก', icon: '🏆' },
  { id: 'quiz-master', title: 'เจ้าแห่งแบบทดสอบ', description: 'สอบผ่าน 10 แบบทดสอบ', icon: '⭐' },
  { id: 'fast-learner', title: 'เรียนรู้เร็ว', description: 'จบ 5 บทเรียนใน 1 วัน', icon: '⚡' },
] as const;
