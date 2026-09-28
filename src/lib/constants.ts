export const SITE_CONFIG = {
  name: 'EduLearn',
  description: 'แพลตฟอร์มการเรียนรู้ออนไลน์ที่ทำให้การศึกษาเป็นเรื่องสนุก',
  url: 'https://edulearn.vercel.app',
  locale: 'th-TH',
};

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
