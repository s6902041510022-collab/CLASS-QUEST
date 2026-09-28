import { Course } from '@/types';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

interface CourseCardProps {
  course: Course;
  className?: string;
}

export default function CourseCard({ course, className }: CourseCardProps) {
  const levelConfig = {
    beginner: { label: 'เริ่มต้น', color: 'accent' },
    intermediate: { label: 'ระดับกลาง', color: 'secondary' },
    advanced: { label: 'ระดับสูง', color: 'warm' },
  };

  const level = levelConfig[course.level];

  return (
    <Card
      variant="elevated"
      padding="none"
      className={cn('overflow-hidden group cursor-pointer', className)}
    >
      {/* Thumbnail */}
      <div className="relative h-48 bg-gradient-to-br from-primary-400 to-secondary-500 overflow-hidden">
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
        <div className="absolute top-3 left-3">
          <Badge variant={level.color as any} size="sm">
            {level.label}
          </Badge>
        </div>
        <div className="absolute bottom-3 right-3">
          <span className="px-2 py-1 text-xs font-medium text-white bg-black/30 rounded-md backdrop-blur-sm">
            {course.duration}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
            {course.category}
          </span>
        </div>

        <h3 className="text-lg font-semibold text-text-primary mb-2 group-hover:text-primary-600 transition-colors line-clamp-2">
          {course.title}
        </h3>

        <p className="text-sm text-text-secondary mb-4 line-clamp-2">
          {course.description}
        </p>

        {/* Instructor */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center">
            <span className="text-white text-xs font-medium">
              {course.instructor.charAt(0)}
            </span>
          </div>
          <span className="text-sm text-text-secondary">{course.instructor}</span>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between pt-4 border-t border-border-light">
          <div className="flex items-center gap-4 text-sm text-text-secondary">
            <span className="flex items-center gap-1">
              <span>📖</span>
              {course.lessons} บทเรียน
            </span>
            <span className="flex items-center gap-1">
              <span>👥</span>
              {course.students.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-warm-500">★</span>
            <span className="text-sm font-medium text-text-primary">{course.rating}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
