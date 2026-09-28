import { Lesson } from '@/types';
import LessonList from '@/components/features/LessonList';
import VideoPlayer from '@/components/features/VideoPlayer';
import QuizCard from '@/components/features/QuizCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

export default function LessonPage({ params }: { params: { id: string } }) {
  const lessons: Lesson[] = [
    { id: '1', courseId: '1', title: 'Introduction to HTML', description: '', duration: 15, type: 'video', completed: true, order: 1 },
    { id: '2', courseId: '1', title: 'HTML Elements', description: '', duration: 20, type: 'video', completed: true, order: 2 },
    { id: '3', courseId: '1', title: 'HTML Forms', description: '', duration: 25, type: 'video', completed: false, order: 3 },
    { id: '4', courseId: '1', title: 'HTML Quiz', description: '', duration: 10, type: 'quiz', completed: false, order: 4 },
    { id: '5', courseId: '1', title: 'Introduction to CSS', description: '', duration: 18, type: 'video', completed: false, order: 5 },
    { id: '6', courseId: '1', title: 'CSS Selectors', description: '', duration: 22, type: 'video', completed: false, order: 6 },
  ];

  const currentLesson = lessons.find((l) => l.id === params.id) || lessons[0];

  const quiz = {
    id: '1',
    lessonId: '4',
    title: 'HTML Basics Quiz',
    questions: [
      {
        id: '1',
        text: 'HTML ย่อมาจากอะไร?',
        options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Markup Language', 'Home Tool Markup Language'],
        correctAnswer: 0,
        explanation: 'HTML ย่อมาจาก Hyper Text Markup Language',
      },
      {
        id: '2',
        text: 'แท็กไหนใช้สำหรับหัวข้อใหญ่สุด?',
        options: ['<h6>', '<h1>', '<heading>', '<head>'],
        correctAnswer: 1,
        explanation: '<h1> คือแท็กสำหรับหัวข้อใหญ่สุด',
      },
      {
        id: '3',
        text: 'แท็กไหนใช้สำหรับย่อหน้า?',
        options: ['<para>', '<p>', '<text>', '<paragraph>'],
        correctAnswer: 1,
        explanation: '<p> คือแท็กสำหรับย่อหน้า',
      },
    ],
    passingScore: 70,
  };

  return (
    <div className="min-h-screen bg-bg-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <span>หลักสูตร</span>
              <span>/</span>
              <span>Web Development</span>
              <span>/</span>
              <span className="text-text-primary">{currentLesson.title}</span>
            </div>

            {/* Lesson Content */}
            {currentLesson.type === 'video' && (
              <VideoPlayer
                src="/videos/lesson.mp4"
                title={currentLesson.title}
                onComplete={() => console.log('Lesson completed!')}
              />
            )}

            {currentLesson.type === 'quiz' && (
              <QuizCard quiz={quiz} onComplete={(score, total) => console.log(`Score: ${score}/${total}`)} />
            )}

            {/* Lesson Info */}
            <Card variant="elevated">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <Badge variant="primary" size="sm" className="mb-2">
                    บทเรียนที่ {currentLesson.order}
                  </Badge>
                  <h1 className="text-2xl font-bold text-text-primary">{currentLesson.title}</h1>
                </div>
              </div>
              <p className="text-text-secondary mb-6">
                ในบทเรียนนี้ คุณจะได้เรียนรู้เกี่ยวกับ {currentLesson.title} ซึ่งเป็นส่วนสำคัญของการพัฒนาเว็บ
              </p>
              <div className="flex gap-3">
                <Button variant="outline">บทเรียนก่อนหน้า</Button>
                <Button>บทเรียนถัดไป</Button>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card variant="elevated" padding="none" className="sticky top-24">
              <div className="p-4 border-b border-border-light">
                <h2 className="font-semibold text-text-primary">เนื้อหาบทเรียน</h2>
              </div>
              <div className="p-4">
                <LessonList
                  lessons={lessons}
                  currentLessonId={currentLesson.id}
                  onSelect={(lesson) => console.log('Selected:', lesson.title)}
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
