'use client';

import { cn } from '@/lib/utils';

interface ProgressChartProps {
  data: {
    label: string;
    value: number;
    color?: string;
  }[];
  type?: 'bar' | 'line' | 'donut';
  className?: string;
}

export default function ProgressChart({
  data,
  type = 'bar',
  className,
}: ProgressChartProps) {
  if (type === 'donut') {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let cumulative = 0;

    return (
      <div className={cn('flex items-center gap-6', className)}>
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90">
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const strokeDasharray = `${percentage} ${100 - percentage}`;
              const strokeDashoffset = -cumulative;
              cumulative += percentage;

              return (
                <circle
                  key={index}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={item.color || `var(--primary-500)`}
                  strokeWidth="20"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl font-bold text-text-primary">{total}</p>
              <p className="text-xs text-text-secondary">รวม</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color || `var(--primary-500)` }}
              />
              <span className="text-sm text-text-secondary">{item.label}</span>
              <span className="text-sm font-medium text-text-primary">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'line') {
    const maxValue = Math.max(...data.map((d) => d.value));

    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-end gap-2 h-40">
          {data.map((item, index) => {
            const height = (item.value / maxValue) * 100;
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full relative flex-1 flex items-end">
                  <div
                    className="w-full bg-gradient-to-t from-primary-500 to-primary-400 rounded-t-lg transition-all duration-500"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="text-xs text-text-tertiary">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Bar chart (default)
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className={cn('space-y-3', className)}>
      {data.map((item, index) => {
        const width = (item.value / maxValue) * 100;
        return (
          <div key={index} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">{item.label}</span>
              <span className="font-medium text-text-primary">{item.value}</span>
            </div>
            <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-500"
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
