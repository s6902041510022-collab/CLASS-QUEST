# 🎓 Education Web Development Skill

## ภาพรวม
Skill สำหรับพัฒนาเว็บแอปพลิเคชันเพื่อการศึกษา โดยเน้น:
- **เทคโนโลยี**: Next.js 14+ (App Router) + TypeScript + Tailwind CSS
- **ที่เก็บโค้ด**: GitHub
- **Hosting**: Vercel
- **สไตล์ดีไซน์**: มินิมอล สวยงาม สีสดใส เรียบหรู มีเอกลักษณ์

---

## 📁 โครงสร้างโปรเจกต์

```
education-web/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions สำหรับ CI/CD
├── public/
│   ├── images/
│   ├── icons/
│   └── fonts/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout พร้อมธีม
│   │   ├── page.tsx            # หน้าแรก
│   │   ├── globals.css         # Global styles + CSS variables
│   │   ├── courses/
│   │   │   └── page.tsx        # หน้ารายวิชา
│   │   ├── lessons/
│   │   │   └── [id]/
│   │   │       └── page.tsx    # หน้าบทเรียน
│   │   ├── dashboard/
│   │   │   └── page.tsx        # แดชบอร์ด
│   │   └── api/
│   │       └── route.ts        # API routes
│   ├── components/
│   │   ├── ui/                 # คอมโพเนนต์พื้นฐาน
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Progress.tsx
│   │   │   └── Badge.tsx
│   │   ├── layout/             # คอมโพเนนต์เลย์เอาต์
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Container.tsx
│   │   └── features/           # คอมโพเนนต์เฉพาะทาง
│   │       ├── CourseCard.tsx
│   │       ├── LessonList.tsx
│   │       ├── QuizCard.tsx
│   │       ├── ProgressChart.tsx
│   │       └── VideoPlayer.tsx
│   ├── lib/
│   │   ├── utils.ts            # Utility functions
│   │   ├── constants.ts        # ค่าคงที่
│   │   └── data.ts             # ข้อมูลตัวอย่าง
│   ├── hooks/
│   │   ├── useTheme.ts
│   │   ├── useProgress.ts
│   │   └── useAuth.ts
│   ├── types/
│   │   └── index.ts            # TypeScript types
│   └── styles/
│       └── theme.ts            # ธีมและสี
├── .env.local                  # Environment variables
├── .env.example
├── .eslintrc.json
├── .gitignore
├── next.config.js
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json
└── README.md
```

---

## 🎨 ระบบธีมและสี (Theme System)

### หลักการออกแบบ
- **มินิมอล**: ลดความซับซ้อน เน้นเนื้อหา
- **สดใส**: สีสวยงาม สดใส ไม่หมองหม่น
- **เรียบหรู**: ขอบมน เงานุ่ม ระยะห่างสม่ำเสมอ
- **เอกลักษณ์**: ฟอนต์ไทย + อังกฤษ การ์ดโค้งมน ไอคอนสวยงาม

### ชุดสีหลัก (Color Palette)

```css
/* globals.css */
:root {
  /* Primary - สีม่วงอมชมพู (ความคิดสร้างสรรค์) */
  --primary-50: #faf5ff;
  --primary-100: #f3e8ff;
  --primary-200: #e9d5ff;
  --primary-300: #d8b4fe;
  --primary-400: #c084fc;
  --primary-500: #a855f7;
  --primary-600: #9333ea;
  --primary-700: #7e22ce;
  --primary-800: #6b21a8;
  --primary-900: #581c87;

  /* Secondary - สีฟ้า (ความน่าเชื่อถือ) */
  --secondary-50: #f0f9ff;
  --secondary-100: #e0f2fe;
  --secondary-200: #bae6fd;
  --secondary-300: #7dd3fc;
  --secondary-400: #38bdf8;
  --secondary-500: #0ea5e9;
  --secondary-600: #0284c7;
  --secondary-700: #0369a1;
  --secondary-800: #075985;
  --secondary-900: #0c4a6e;

  /* Accent - สีเขียว (ความสำเร็จ) */
  --accent-50: #f0fdf4;
  --accent-100: #dcfce7;
  --accent-200: #bbf7d0;
  --accent-300: #86efac;
  --accent-400: #4ade80;
  --accent-500: #22c55e;
  --accent-600: #16a34a;
  --accent-700: #15803d;
  --accent-800: #166534;
  --accent-900: #14532d;

  /* Warm Accent - สีส้ม (พลัง) */
  --warm-50: #fff7ed;
  --warm-100: #ffedd5;
  --warm-200: #fed7aa;
  --warm-300: #fdba74;
  --warm-400: #fb923c;
  --warm-500: #f97316;
  --warm-600: #ea580c;
  --warm-700: #c2410c;
  --warm-800: #9a3412;
  --warm-900: #7c2d12;

  /* Neutral - สีเทา (พื้นหลัง) */
  --neutral-50: #fafafa;
  --neutral-100: #f5f5f5;
  --neutral-200: #e5e5e5;
  --neutral-300: #d4d4d4;
  --neutral-400: #a3a3a3;
  --neutral-500: #737373;
  --neutral-600: #525252;
  --neutral-700: #404040;
  --neutral-800: #262626;
  --neutral-900: #171717;

  /* Semantic */
  --success: var(--accent-500);
  --warning: #f59e0b;
  --error: #ef4444;
  --info: var(--secondary-500);

  /* Background & Surface */
  --bg-primary: #ffffff;
  --bg-secondary: #fafafa;
  --bg-tertiary: #f5f5f5;
  --surface: #ffffff;
  --surface-hover: #f9fafb;

  /* Text */
  --text-primary: #171717;
  --text-secondary: #525252;
  --text-tertiary: #a3a3a3;
  --text-inverse: #ffffff;

  /* Border */
  --border-light: #e5e5e5;
  --border-medium: #d4d4d4;

  /* Shadow */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

  /* Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.5rem;
  --radius-full: 9999px;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-20: 5rem;
  --space-24: 6rem;
}

/* Dark Mode */
[data-theme="dark"] {
  --bg-primary: #0a0a0a;
  --bg-secondary: #171717;
  --bg-tertiary: #262626;
  --surface: #171717;
  --surface-hover: #262626;

  --text-primary: #fafafa;
  --text-secondary: #a3a3a3;
  --text-tertiary: #737373;
  --text-inverse: #171717;

  --border-light: #262626;
  --border-medium: #404040;

  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.3);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.4);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.6), 0 8px 10px -6px rgb(0 0 0 / 0.5);
}
```

---

## 🧩 คอมโพเนนต์หลัก

### 1. Button Component

```tsx
// src/components/ui/Button.tsx
import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'warm';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg';
    
    const variants = {
      primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500 shadow-md hover:shadow-lg',
      secondary: 'bg-secondary-500 text-white hover:bg-secondary-600 focus:ring-secondary-500 shadow-md hover:shadow-lg',
      outline: 'border-2 border-primary-500 text-primary-600 hover:bg-primary-50 focus:ring-primary-500',
      ghost: 'text-neutral-600 hover:bg-neutral-100 focus:ring-neutral-500',
      warm: 'bg-warm-500 text-white hover:bg-warm-600 focus:ring-warm-500 shadow-md hover:shadow-lg',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={isLoading}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
```

### 2. Card Component

```tsx
// src/components/ui/Card.tsx
import { cn } from '@/lib/utils';
import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
    const variants = {
      default: 'bg-surface border border-border-light',
      elevated: 'bg-surface shadow-lg hover:shadow-xl transition-shadow duration-300',
      outlined: 'bg-transparent border-2 border-border-light',
      gradient: 'bg-gradient-to-br from-primary-500 to-secondary-500 text-white',
    };

    const paddings = {
      none: '',
      sm: 'p-3',
      md: 'p-5',
      lg: 'p-8',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl',
          variants[variant],
          paddings[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
export default Card;
```

### 3. Progress Component

```tsx
// src/components/ui/Progress.tsx
import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number;
  max?: number;
  variant?: 'primary' | 'secondary' | 'accent' | 'warm';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export default function Progress({
  value,
  max = 100,
  variant = 'primary',
  size = 'md',
  showLabel = false,
  className,
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const variants = {
    primary: 'from-primary-400 to-primary-600',
    secondary: 'from-secondary-400 to-secondary-600',
    accent: 'from-accent-400 to-accent-600',
    warm: 'from-warm-400 to-warm-600',
  };

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between mb-1.5">
          <span className="text-sm font-medium text-text-secondary">ความคืบหน้า</span>
          <span className="text-sm font-bold text-primary-600">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={cn('w-full bg-neutral-200 rounded-full overflow-hidden', sizes[size])}>
        <div
          className={cn('h-full bg-gradient-to-r rounded-full transition-all duration-500 ease-out', variants[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
```

### 4. Badge Component

```tsx
// src/components/ui/Badge.tsx
import { cn } from '@/lib/utils';
import { HTMLAttributes, forwardRef } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'warm' | 'neutral';
  size?: 'sm' | 'md';
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const variants = {
      primary: 'bg-primary-100 text-primary-700',
      secondary: 'bg-secondary-100 text-secondary-700',
      accent: 'bg-accent-100 text-accent-700',
      warm: 'bg-warm-100 text-warm-700',
      neutral: 'bg-neutral-100 text-neutral-700',
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center font-medium rounded-full',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
export default Badge;
```

---

## 📄 หน้าเว็บตัวอย่าง

### 1. หน้าแรก (Landing Page)

```tsx
// src/app/page.tsx
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
```

### 2. หน้าแดชบอร์ด

```tsx
// src/app/dashboard/page.tsx
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
```

---

## ⚙️ การตั้งค่าโปรเจกต์

### package.json

```json
{
  "name": "education-web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write ."
  },
  "dependencies": {
    "next": "14.2.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "autoprefixer": "^10.4.17",
    "eslint": "^8.56.0",
    "eslint-config-next": "14.2.0",
    "postcss": "^8.4.35",
    "prettier": "^3.2.0",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.0"
  }
}
```

### tailwind.config.ts

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--primary-50)',
          100: 'var(--primary-100)',
          200: 'var(--primary-200)',
          300: 'var(--primary-300)',
          400: 'var(--primary-400)',
          500: 'var(--primary-500)',
          600: 'var(--primary-600)',
          700: 'var(--primary-700)',
          800: 'var(--primary-800)',
          900: 'var(--primary-900)',
        },
        secondary: {
          50: 'var(--secondary-50)',
          100: 'var(--secondary-100)',
          200: 'var(--secondary-200)',
          300: 'var(--secondary-300)',
          400: 'var(--secondary-400)',
          500: 'var(--secondary-500)',
          600: 'var(--secondary-600)',
          700: 'var(--secondary-700)',
          800: 'var(--secondary-800)',
          900: 'var(--secondary-900)',
        },
        accent: {
          50: 'var(--accent-50)',
          100: 'var(--accent-100)',
          200: 'var(--accent-200)',
          300: 'var(--accent-300)',
          400: 'var(--accent-400)',
          500: 'var(--accent-500)',
          600: 'var(--accent-600)',
          700: 'var(--accent-700)',
          800: 'var(--accent-800)',
          900: 'var(--accent-900)',
        },
        warm: {
          50: 'var(--warm-50)',
          100: 'var(--warm-100)',
          200: 'var(--warm-200)',
          300: 'var(--warm-300)',
          400: 'var(--warm-400)',
          500: 'var(--warm-500)',
          600: 'var(--warm-600)',
          700: 'var(--warm-700)',
          800: 'var(--warm-800)',
          900: 'var(--warm-900)',
        },
        neutral: {
          50: 'var(--neutral-50)',
          100: 'var(--neutral-100)',
          200: 'var(--neutral-200)',
          300: 'var(--neutral-300)',
          400: 'var(--neutral-400)',
          500: 'var(--neutral-500)',
          600: 'var(--neutral-600)',
          700: 'var(--neutral-700)',
          800: 'var(--neutral-800)',
          900: 'var(--neutral-900)',
        },
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
        },
        surface: 'var(--surface)',
        'surface-hover': 'var(--surface-hover)',
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          inverse: 'var(--text-inverse)',
        },
        border: {
          light: 'var(--border-light)',
          medium: 'var(--border-medium)',
        },
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        full: 'var(--radius-full)',
      },
    },
  },
  plugins: [],
};

export default config;
```

### next.config.js

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: ['@/components'],
  },
};

module.exports = nextConfig;
```

### vercel.json

```json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "devCommand": "next dev",
  "installCommand": "npm install",
  "regions": ["sin1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

---

## 🔄 GitHub Actions (CI/CD)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 📋 คำแนะนำการใช้งาน

### 1. เริ่มต้นโปรเจกต์
```bash
# สร้างโปรเจกต์ใหม่
npx create-next-app@latest education-web --typescript --tailwind --app

# ติดตั้ง dependencies เพิ่มเติม
npm install clsx tailwind-merge

# รัน development server
npm run dev
```

### 2. ตั้งค่า GitHub + Vercel
1. สร้าง Repository บน GitHub
2. Push โค้ดขึ้น GitHub
3. เชื่อมต่อกับ Vercel ผ่าน Vercel Dashboard
4. ตั้งค่า Environment Variables:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`

### 3. หลักการออกแบบ
- **ใช้ CSS Variables** สำหรับสีและธีม
- **Responsive Design** เริ่มจาก Mobile First
- **Accessibility** ใช้ ARIA labels และ semantic HTML
- **Performance** ใช้ Next.js Image Optimization
- **Dark Mode** รองรับทั้ง Light และ Dark theme

### 4. การเพิ่มคอมโพเนนต์ใหม่
1. สร้างไฟล์ใน `src/components/ui/`
2. ใช้ `cn()` utility สำหรับ class merging
3. รองรับ `variant` และ `size` props
4. เพิ่ม TypeScript types

### 5. การเพิ่มหน้าใหม่
1. สร้างไฟล์ใน `src/app/`
2. ใช้ Layout ที่มีอยู่
3. เพิ่ม Metadata สำหรับ SEO
4. ทดสอบ Responsive

---

## 🎯 สรุป

Skill นี้มี:
- ✅ โครงสร้างโปรเจกต์ที่เป็นระบบ
- ✅ ระบบธีมและสีที่สวยงาม มินิมอล
- ✅ คอมโพเนนต์ UI ที่ใช้งานได้จริง
- ✅ ตัวอย่างหน้าเว็บสำหรับการศึกษา
- ✅ การเชื่อมต่อ GitHub + Vercel
- ✅ CI/CD pipeline อัตโนมัติ
- ✅ รองรับ Dark Mode
- ✅ Responsive Design
- ✅ TypeScript types ครบถ้วน
