import type { Metadata } from 'next';
import { Prompt } from 'next/font/google';
import './globals.css';

const prompt = Prompt({ 
  subsets: ['thai'], 
  weight: ['400', '500', '600', '700'],
  variable: '--font-prompt',
});

export const metadata: Metadata = {
  title: {
    default: 'CLASS QUEST - Learn. Play. Quest.',
    template: '%s | CLASS QUEST',
  },
  description: 'Interactive Educational Game Platform สำหรับใช้ในห้องเรียน ทำให้นักเรียนรู้สึกว่ากำลังเล่นเกม ไม่ใช่กำลังทำข้อสอบ',
  keywords: ['education', 'game', 'classroom', 'learning', 'gamification', 'เกมเรียนรู้', 'ห้องเรียน'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={prompt.variable}>
      <body className="min-h-screen bg-quest-white text-quest-text font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
