import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

export default function HomePage() {
  const features = [
    {
      icon: '📚',
      title: 'เรียนรู้ได้ทุกที่',
      description: 'เข้าถึงบทเรียนได้จากทุกอุปกรณ์ ทุกที่ ทุกเวลา',
      color: 'primary',
    },
    {
      icon: '🎯',
      title: 'เป้าหมายชัดเจน',
      description: 'ติดตามความคืบหน้า และวางแผนการเรียนรู้',
      color: 'secondary',
    },
    {
      icon: '🏆',
      title: 'ได้รับการรับรอง',
      description: 'ประกาศนียบัตรที่มีคุณค่า เมื่อจบคอร์ส',
      color: 'accent',
    },
    {
      icon: '💬',
      title: 'ชุมชนนักเรียน',
      description: 'พูดคุย แลกเปลี่ยน และเรียนรู้ร่วมกัน',
      color: 'warm',
    },
  ];

  const courses = [
    { title: 'Web Development', lessons: 24, duration: '8 สัปดาห์', level: 'เริ่มต้น', color: 'primary' },
    { title: 'Data Science', lessons: 32, duration: '12 สัปดาห์', level: 'กลาง', color: 'secondary' },
    { title: 'UI/UX Design', lessons: 18, duration: '6 สัปดาห์', level: 'เริ่มต้น', color: 'accent' },
    { title: 'Mobile App', lessons: 28, duration: '10 สัปดาห์', level: 'กลาง', color: 'warm' },
  ];

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-secondary-50 to-accent-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center">
            <Badge variant="primary" size="md" className="mb-6">
              🚀 เปิดสมัครแล้ว
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary mb-6">
              เรียนรู้ได้ทุกที่
              <br />
              <span className="bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
                ทุกเวลา
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mb-10">
              แพลตฟอร์มการเรียนรู้ออนไลน์ที่ออกแบบมาเพื่อคุณ
              เรียนรู้ได้ตามจังหวะของคุณ ด้วยเนื้อหาคุณภาพสูง
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg">เริ่มเรียนฟรี</Button>
              <Button variant="outline" size="lg">ดูคอร์สทั้งหมด</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
              ทำไมต้องเลือกเรา
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              เรามีทุกอย่างที่คุณต้องการสำหรับการเรียนรู้
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} variant="elevated" className="text-center hover:-translate-y-1 transition-transform duration-300">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-text-primary mb-2">{feature.title}</h3>
                <p className="text-text-secondary">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Courses Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
              คอร์สยอดนิยม
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              คอร์สเรียนที่คนสนใจมากที่สุด
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {courses.map((course, index) => (
              <Card key={index} variant="elevated" className="overflow-hidden group cursor-pointer">
                <div className={`h-32 bg-gradient-to-br from-${course.color}-400 to-${course.color}-600 mb-4 -mx-5 -mt-5`} />
                <Badge variant={course.color as any} size="sm" className="mb-3">{course.level}</Badge>
                <h3 className="text-lg font-semibold text-text-primary mb-2 group-hover:text-primary-600 transition-colors">
                  {course.title}
                </h3>
                <div className="flex items-center gap-4 text-sm text-text-secondary">
                  <span>📖 {course.lessons} บทเรียน</span>
                  <span>⏱️ {course.duration}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-500 to-secondary-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            พร้อมเริ่มต้นการเดินทางแล้วหรือยัง
          </h2>
          <p className="text-lg text-white/90 mb-10">
            เข้าร่วมกับนักเรียนกว่า 10,000 คนที่กำลังเรียนรู้อยู่
          </p>
          <Button variant="warm" size="lg" className="bg-white text-primary-600 hover:bg-neutral-100">
            สมัครสมาชิกฟรี
          </Button>
        </div>
      </section>
    </div>
  );
}
