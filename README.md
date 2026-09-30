# 🎓 EduLearn - แพลตฟอร์มการเรียนรู้ออนไลน์

แพลตฟอร์มการเรียนรู้ออนไลน์ที่ออกแบบมาเพื่อให้การศึกษาเป็นเรื่องสนุกและมีประสิทธิภาพ

## ✨ คุณสมบัติ

- 📚 คอร์สเรียนหลากหลาย
- 🎬 วิดีโอเรียนคุณภาพสูง
- ❓ แบบทดสอบอินเทอร์แอกทีฟ
- 📊 ติดตามความคืบหน้า
- 🏆 ระบบตราวิเศษ
- 🌙 รองรับ Dark Mode
- 📱 Responsive Design

## 🚀 เทคโนโลยี

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Hosting**: Vercel
- **Repository**: GitHub

## 📋 การติดตั้ง

> **ต้องใช้ Node.js 24 ขึ้นไป** — เทสต์ชุดหนึ่ง import ไฟล์ `.ts` ตรง ๆ ซึ่งต้องใช้
> ความสามารถ strip types ของ Node (ถ้าใช้ Node 20 จะได้ `ERR_UNKNOWN_FILE_EXTENSION`)

```bash
# Clone repository
git clone https://github.com/s6902041510022-collab/CLASS-QUEST.git

# เข้าไปในโฟลเดอร์โปรเจกต์
cd CLASS-QUEST

# ติดตั้ง dependencies
npm install

# สร้างไฟล์ .env.local
cp .env.example .env.local

# เตรียมเกมตัวอย่าง (ทำซ้ำได้ ไม่สร้างข้อมูลซ้ำ)
npm run seed

# รัน development server
npm run dev
```

### เกมตัวอย่างที่ได้จาก `npm run seed`

| id | ชื่อ | หมายเหตุ |
| --- | --- | --- |
| `demo-game-1` | จักรวาลแห่งข้อมูล | เกมตั้งต้น (มากับ `data/db.default.json`) |
| `seed-game-2` | คลังข้อมูลมหัศจรรย์ | คำถามหลากหลายรูปแบบ |
| `seed-game-3` | ทีมนักสำรวจคลังมหาสมุทร | เกมทีม |
| `seed-game-4` | สามวิธีแก้ปัญหา | **คำถาม 3 ชนิด** — ตัวเลือก / กรอกตัวเลข / จับคู่ |

> `seed-game-4` คือเกมที่ควรเปิดลองก่อน มีทั้ง 3 ชนิดคำถาม รวมถึงด่านบอสที่ผสมชนิดกัน

## 🧪 การทดสอบ

```bash
npm test        # unit + e2e (ต้องเปิด dev server ที่พอร์ต 3000 สำหรับส่วน e2e)
npm run check   # tsc --noEmit + production build
```

ทุก push และ PR ขึ้น `main` จะรันอัตโนมัติที่ Actions (`tsc + build` และ `npm test`)
ดูสถานะได้ที่ https://github.com/s6902041510022-collab/CLASS-QUEST/actions

## 🔧 การตั้งค่า

1. สร้างไฟล์ `.env.local` จาก `.env.example`
2. ตั้งค่า Environment Variables ที่จำเป็น
3. รัน `npm run dev` เพื่อเริ่มพัฒนา

## 📦 Build & Deploy

```bash
# Build production
npm run build

# รัน production server
npm start

# Deploy ขึ้น Vercel (อัตโนมัติเมื่อ push เข้า default branch)
git push origin main
```

## 🏗️ โครงสร้างโปรเจกต์

```
src/
├── app/                # Next.js App Router
├── components/         # React components
│   ├── ui/            # คอมโพเนนต์พื้นฐาน
│   ├── layout/        # คอมโพเนนต์เลย์เอาต์
│   └── features/      # คอมโพเนนต์เฉพาะทาง
├── lib/               # Utilities และ constants
├── hooks/             # Custom React hooks
├── types/             # TypeScript types
└── styles/            # Global styles
```

## 🎨 การปรับแต่งธีม

แก้ไข CSS Variables ใน `src/app/globals.css`:

```css
:root {
  --primary-500: #a855f7;  /* สีหลัก */
  --secondary-500: #0ea5e9; /* สีรอง */
  --accent-500: #22c55e;   /* สีเน้น */
}
```

## 📄 License

MIT License

## 🤝 การมีส่วนร่วม

ยินดีต้อนรับการมีส่วนร่วมในการพัฒนา! กรุณาอ่าน [CONTRIBUTING.md](CONTRIBUTING.md)

## 📧 ติดต่อ

- Website: https://edulearn.vercel.app
- Email: contact@edulearn.com
