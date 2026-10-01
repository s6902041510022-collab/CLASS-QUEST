import Link from 'next/link';
import { MASCOT } from '@/lib/utils';
import HelpGuide from '@/components/HelpGuide';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-quest-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-lavender-50 to-mint-50" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="text-center">
            {/* Mascot */}
            <div className="text-8xl mb-6 animate-float mascot-shadow">
              {MASCOT.emoji}
            </div>
            
            {/* Logo */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-4">
              <span className="gradient-text">CLASS QUEST</span>
            </h1>
            
            {/* Tagline */}
            <p className="text-2xl sm:text-3xl text-quest-text/80 font-medium mb-8">
              Learn. Play. Quest.
            </p>
            
            {/* Description */}
            <p className="text-lg text-quest-text/60 max-w-2xl mx-auto mb-12">
              Interactive Educational Game Platform สำหรับใช้ในห้องเรียน
              <br />
              ทำให้นักเรียนรู้สึกว่ากำลังเล่นเกม ไม่ใช่กำลังทำข้อสอบ
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/teacher/login" className="btn-primary text-lg">
                👨‍🏫 สำหรับครู
              </Link>
              <Link href="/student/join" className="btn-secondary text-lg">
                🎮 สำหรับนักเรียน
              </Link>
            </div>

            {/* คู่มือใช้งาน — คนที่ไม่รู้จะเริ่มจากไหน เปิดอ่านได้ตรงนี้ */}
            <div className="mt-6 flex justify-center">
              <HelpGuide />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              ทำไมต้อง <span className="gradient-text">CLASS QUEST</span>?
            </h2>
            <p className="text-quest-text/60 max-w-2xl mx-auto">
              เปลี่ยนห้องเรียนให้เป็นเกมที่สนุก
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: '🎮', title: 'เล่นเกม', desc: 'นักเรียนรู้สึกว่ากำลังเล่นเกม ไม่ใช่ทำข้อสอบ' },
              { icon: '🎯', title: 'ภารกิจ', desc: 'Mission ที่หลากหลาย ท้าทายความคิด' },
              { icon: '👹', title: 'Boss Battle', desc: 'สู้กับ Boss เพื่อผ่านด่าน' },
              { icon: '🏆', title: 'รางวัล', desc: 'XP, Achievements และ Leaderboard' },
              { icon: '👥', title: 'ทีม', desc: 'ทำงานร่วมกันเป็นทีม' },
              { icon: '📊', title: 'วิเคราะห์', desc: 'ดูผลการเรียนรู้แบบ Real-time' },
            ].map((feature, index) => (
              <div key={index} className="card card-hover p-6 text-center">
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-quest-text/60">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-gradient-to-br from-sky-50 to-lavender-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              เริ่มต้นใช้งาน
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Teacher */}
            <div className="card p-8">
              <div className="text-6xl mb-4">👨‍🏫</div>
              <h3 className="text-2xl font-bold mb-4">สำหรับครู</h3>
              <ul className="space-y-3 text-quest-text/70">
                <li className="flex items-start gap-2">
                  <span className="text-quest-sky">✓</span>
                  สร้างเกมและ Mission
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-quest-sky">✓</span>
                  ควบคุมเกมแบบ Real-time
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-quest-sky">✓</span>
                  ดูผลและวิเคราะห์การเรียนรู้
                </li>
              </ul>
              <Link href="/teacher/login" className="btn-primary mt-6 inline-block">
                เริ่มต้น
              </Link>
            </div>
            
            {/* Student */}
            <div className="card p-8">
              <div className="text-6xl mb-4">🎮</div>
              <h3 className="text-2xl font-bold mb-4">สำหรับนักเรียน</h3>
              <ul className="space-y-3 text-quest-text/70">
                <li className="flex items-start gap-2">
                  <span className="text-quest-mint">✓</span>
                  เข้าร่วมด้วย Room Code
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-quest-mint">✓</span>
                  เล่นเกมและตอบคำถาม
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-quest-mint">✓</span>
                  สะสม XP และรางวัล
                </li>
              </ul>
              <Link href="/student/join" className="btn-success mt-6 inline-block">
                เข้าร่วมเกม
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="text-4xl mb-4">{MASCOT.emoji}</div>
          <p className="text-quest-text/60">
            CLASS QUEST - Learn. Play. Quest.
          </p>
          <p className="text-sm text-quest-text/40 mt-2">
            Interactive Educational Game Platform
          </p>
        </div>
      </footer>
    </div>
  );
}
