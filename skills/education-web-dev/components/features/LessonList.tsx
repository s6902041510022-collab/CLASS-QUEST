'use client';

import { Lesson } from '@/types';
import { LESSON_TYPES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/utils';

interface LessonListProps {
  lessons: Lesson[];
  currentLessonId?: string;
  onSelect?: (lesson: Lesson) => void;
  className?: string;
}

export default function LessonList({
  lessons,
  currentLessonId,
  onSelect,
  className,
}: LessonListProps) {
  const completedCount = lessons.filter((l) => l.completed).length;
  const progress = Math.round((completedCount / lessons.length) * 100);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-text-primary">เนื้อหาบทเรียน</h3>
        <span className="text-sm text-text-secondary">
          {completedCount}/{lessons.length} บทเรียน ({progress}%)
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Lesson Items */}
      <div className="space-y-2">
        {lessons.map((lesson, index) => {
          const typeConfig = LESSON_TYPES[lesson.type];
          const isActive = lesson.id === currentLessonId;

          return (
            <button
              key={lesson.id}
              onClick={() => onSelect?.(lesson)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all',
                isActive
                  ? 'bg-primary-50 border-2 border-primary-500'
                  : 'bg-surface border border-border-light hover:border-primary-300 hover:bg-primary-50/50'
              )}
            >
              {/* Order Number / Check */}
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium',
                  lesson.completed
                    ? 'bg-accent-100 text-accent-600'
                    : isActive
                    ? 'bg-primary-100 text-primary-600'
                    : 'bg-neutral-100 text-text-secondary'
                )}
              >
                {lesson.completed ? '✓' : index + 1}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm">{typeConfig.icon}</span>
                  <span className="text-xs text-text-tertiary">{typeConfig.label}</span>
                </div>
                <h4
                  className={cn(
                    'text-sm font-medium truncate',
                    isActive ? 'text-primary-700' : 'text-text-primary'
                  )}
                >
                  {lesson.title}
                </h4>
              </div>

              {/* Duration */}
              <span className="text-xs text-text-tertiary flex-shrink-0">
                {formatDuration(lesson.duration)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
