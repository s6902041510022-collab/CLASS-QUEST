import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** ความเสียหายที่บอสได้รับ เมื่อนักเรียนตอบคำถามบอสถูก 1 ข้อ */
export const BOSS_DAMAGE_PER_CORRECT = 200;

/** โบนัส XP สูงสุดจาก "ตอบเร็ว" (ได้เต็มเมื่อตอบถูกทันทีเหลือเวลามากสุด / 0 เมื่อตอบใกล้หมดเวลา) */
export const BONUS_MAX_XP = 20;

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/** ป้ายชื่อรอบการเล่น เช่น "รอบที่ 2 • เดอะควิซ • 28 ก.ย. 16:35 • 1339 XP • ถูก 8/8" — กันงงว่ารอบไหนเป็นรอบไหน */
export function roundLabel(h: any): string {
  const m = String(h.sessionId || '').match(/r(\d+)$/i);
  const game = h.gameName || 'เกม';
  const d = new Date(h.joinedAt);
  const date = d.toLocaleDateString('th-TH');
  const t = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  return `${m ? `รอบที่ ${m[1]}` : game} • ${date} ${t} • ${h.xp || 0} XP • ถูก ${h.correct ?? 0}/${h.total ?? 0}`;
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getRandomAvatar(): string {
  const avatars = ['🦊', '🐱', '🐶', '🐰', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸', '🐵', '🐔'];
  return avatars[Math.floor(Math.random() * avatars.length)];
}

export const TEAM_COLORS = [
  { name: 'Team CPU', color: 'bg-blue-400', text: 'text-blue-700' },
  { name: 'Team Cache', color: 'bg-green-400', text: 'text-green-700' },
  { name: 'Team RAM', color: 'bg-purple-400', text: 'text-purple-700' },
  { name: 'Team Storage', color: 'bg-orange-400', text: 'text-orange-700' },
];

export const MASCOT = {
  name: 'Quester',
  emoji: '🦊',
  description: 'จิ้งจอกสีม่วง-ขาว-ชมพู ตาแป๋ว ขี้อ้อน น่ารัก',
};

export const BOSS_TYPES = [
  { name: 'Memory Overlord', emoji: '👹', description: 'จอมยุทธ์แห่งความทรงจำ' },
  { name: 'Cache King', emoji: '👾', description: 'ราชาแห่งแคช' },
  { name: 'Data Dragon', emoji: '🐉', description: 'มังกรแห่งข้อมูล' },
  { name: 'Code Wizard', emoji: '🧙', description: 'จอมเวทแห่งโค้ด' },
];
