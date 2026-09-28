import CourseCard from '@/components/features/CourseCard';
import Input from '@/components/ui/Input';
import { Course } from '@/types';

export default function CoursesPage() {
  const courses: Course[] = [
    {
      id: '1',
      title: 'Web Development Fundamentals',
      description: 'เรียนรู้พื้นฐานการพัฒนาเว็บตั้งแต่ HTML, CSS, JavaScript จนถึง React',
      thumbnail: '/images/courses/web-dev.jpg',
      instructor: 'อาจารย์สมชาย',
      duration: '8 สัปดาห์',
      lessons: 24,
      level: 'beginner',
      category: 'Programming',
      rating: 4.8,
      students: 1250,
      price: 2990,
      tags: ['HTML', 'CSS', 'JavaScript', 'React'],
    },
    {
      id: '2',
      title: 'Data Science with Python',
      description: 'วิเคราะห์ข้อมูลด้วย Python, Pandas, และ Machine Learning',
      thumbnail: '/images/courses/data-science.jpg',
      instructor: 'ดร.สมหญิง',
      duration: '12 สัปดาห์',
      lessons: 32,
      level: 'intermediate',
      category: 'Data Science',
      rating: 4.9,
      students: 890,
      price: 3990,
      tags: ['Python', 'Pandas', 'Machine Learning'],
    },
    {
      id: '3',
      title: 'UI/UX Design Principles',
      description: 'ออกแบบประสบการณ์ผู้ใช้ที่สวยงามและใช้งานง่าย',
      thumbnail: '/images/courses/ui-ux.jpg',
      instructor: 'คุณมานี',
      duration: '6 สัปดาห์',
      lessons: 18,
      level: 'beginner',
      category: 'Design',
      rating: 4.7,
      students: 650,
      price: 2490,
      tags: ['Figma', 'Design Thinking', 'Prototyping'],
    },
    {
      id: '4',
      title: 'Mobile App Development',
      description: 'สร้างแอปพลิเคชันมือถือด้วย React Native',
      thumbnail: '/images/courses/mobile.jpg',
      instructor: 'อาจารย์วิชัย',
      duration: '10 สัปดาห์',
      lessons: 28,
      level: 'intermediate',
      category: 'Programming',
      rating: 4.6,
      students: 720,
      price: 3490,
      tags: ['React Native', 'iOS', 'Android'],
    },
  ];

  return (
    <div className="min-h-screen bg-bg-secondary">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500 to-secondary-500 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            คอร์สเรียนทั้งหมด
          </h1>
          <p className="text-white/90 max-w-2xl">
            เลือกเรียนจากคอร์สเรียนคุณภาพสูงที่ออกแบบมาเพื่อคุณ
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {['ทั้งหมด', 'Programming', 'Data Science', 'Design', 'Marketing'].map((filter) => (
              <button
                key={filter}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'ทั้งหมด'
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface text-text-secondary hover:bg-neutral-100'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="w-full sm:w-64">
            <Input
              placeholder="ค้นหาคอร์ส..."
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
        </div>
      </div>

      {/* Course Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </div>
    </div>
  );
}
