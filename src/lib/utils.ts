import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
