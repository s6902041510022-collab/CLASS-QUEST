import Card from '@/components/ui/Card';
import Progress from '@/components/ui/Progress';
import Badge from '@/components/ui/Badge';

export default function DashboardPage() {
  const stats = [
    { label: 'คอร์สที่กำลังเรียน', value: 3, icon: '📚', color: 'primary' },
    { label: 'บทเรียนที่เสร็จแล้ว', value: 47, icon: '✅', color: 'accent' },
    { label: 'ชั่วโมงที่เรียน', value: 28, icon: '⏱️', color: 'secondary' },
    { label: 'คะแนนเฉลี่ย', value: 85, icon: '⭐', color: 'warm' },
  ];

  const continueLearning = [
    { title: 'React Fundamentals', progress: 75, total: 24, completed: 18 },
    { title: 'TypeScript Basics', progress: 45, total: 20, completed: 9 },
    { title: 'Tailwind CSS', progress: 90, total: 15, completed: 13 },
  ];

  return (
    <div className="min-h-screen bg-bg-secondary p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            สวัสดี, คุณสมชาย 👋
          </h1>
          <p className="text-text-secondary">
            วันนี้คุณเรียนไปแล้ว 2 ชั่วโมง เยี่ยมมาก!
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} variant="elevated" className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-${stat.color}-100 flex items-center justify-center text-2xl`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
                <p className="text-sm text-text-secondary">{stat.label}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Continue Learning */}
        <Card variant="elevated" className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-text-primary">เรียนต่อจากครั้งล่าสุด</h2>
            <Badge variant="primary">3 คอร์ส</Badge>
          </div>
          <div className="space-y-4">
            {continueLearning.map((course, index) => (
              <div key={index} className="flex items-center gap-4 p-4 rounded-lg bg-bg-tertiary hover:bg-neutral-200 transition-colors cursor-pointer">
                <div className="flex-1">
                  <h3 className="font-medium text-text-primary mb-2">{course.title}</h3>
                  <Progress value={course.progress} size="sm" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-text-primary">{course.completed}/{course.total}</p>
                  <p className="text-xs text-text-secondary">บทเรียน</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card variant="elevated">
            <h2 className="text-xl font-semibold text-text-primary mb-4">กิจกรรมล่าสุด</h2>
            <div className="space-y-3">
              {[
                { action: 'จบบทเรียน "React Hooks"', time: '2 ชั่วโมงที่แล้ว', icon: '✅' },
                { action: 'สอบผ่าน "JavaScript Basics"', time: '1 วันที่แล้ว', icon: '🎉' },
                { action: 'เริ่มคอร์ส "TypeScript"', time: '2 วันที่แล้ว', icon: '📚' },
                { action: 'ได้รับตรา "Fast Learner"', time: '3 วันที่แล้ว', icon: '🏆' },
              ].map((activity, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-bg-tertiary transition-colors">
                  <span className="text-xl">{activity.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">{activity.action}</p>
                    <p className="text-xs text-text-secondary">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card variant="elevated">
            <h2 className="text-xl font-semibold text-text-primary mb-4">ความคืบหน้ารวม</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">Web Development</span>
                  <span className="text-sm text-text-secondary">68%</span>
                </div>
                <Progress value={68} variant="primary" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">Data Science</span>
                  <span className="text-sm text-text-secondary">32%</span>
                </div>
                <Progress value={32} variant="secondary" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">UI/UX Design</span>
                  <span className="text-sm text-text-secondary">85%</span>
                </div>
                <Progress value={85} variant="accent" />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
