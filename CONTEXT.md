# CLASS QUEST — Context

## Project Overview

CLASS QUEST เป็น Interactive Educational Game Platform สำหรับใช้ในห้องเรียน

> "ทำให้นักเรียนรู้สึกว่ากำลังเล่นเกม ไม่ใช่กำลังทำข้อสอบ"

## Core Terminology

### Roles

| Term | Definition |
|------|------------|
| **Game Master** | ครูที่ควบคุมเกม สร้าง Mission และดูแลระบบ |
| **Player** | นักเรียนที่เข้าร่วมเกม ตอบคำถาม และสะสม XP |

### Game Elements

| Term | Definition |
|------|------------|
| **Mission** | ภารกิจที่ Player ต้องทำ (เช่น ตอบคำถาม) |
| **XP** | คะแนนที่ได้รับจากการทำ Mission สำเร็จ |
| **Boss** | ศัตรูตัวสุดท้ายที่ต้องเอาชนะ |
| **Boss HP** | พลังชีวิตของ Boss ลดลงเมื่อตอบถูก |
| **Room Code** | รหัส 6 หลักที่ Player ใช้เข้าร่วมเกม |
| **Lobby** | หน้ารอก่อนเริ่มเกม |
| **Quest Map** | แผนที่แสดงความคืบหน้าของเกม |

### Game Modes

| Term | Definition |
|------|------------|
| **Solo Mode** | เล่นคนเดียว สะสมคะแนนส่วนตัว |
| **Team Mode** | เล่นเป็นทีม คะแนนรวมของทีม |

### Mascot

| Name | Description |
|------|-------------|
| **Quester** | จิ้งจอกสีม่วง-ขาว-ชมพู ตาแป๋ว ขี้อ้อน น่ารัก |

### Boss

| Type | Description |
|------|-------------|
| **Monster** | มอนเตอร์น่ารัก ไม่น่ากลัว |

### Team System

| Feature | Description |
|---------|-------------|
| **Auto Random** | ระบบสุ่มแบ่งทีมให้อัตโนมัติ |

### Design Principles

| Principle | Description |
|-----------|-------------|
| **Minimal** | ไม่รก ไม่ซับซ้อน |
| **Clean** | สะอาดตา อ่านง่าย |
| **Cute** | เป็นมิตร น่ารัก |
| **Premium** | ดูมีคุณภาพ |
| **Bright** | สดใส ไม่มืด |
| **Editable** | แก้ไขข้อมูลได้ทุกส่วน |

## Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Soft White | #FFFFFF | Background |
| Sky Blue | #7DD3FC | Primary Action |
| Soft Lavender | #C4B5FD | Secondary |
| Mint | #A7F3D0 | Success |
| Soft Orange | #FDBA74 | Warning |
| Text | #334155 | Text |

## User Constraints

- **Teacher**: Desktop-first
- **Student**: Mobile-first
- **ไม่มี Dark Theme**
- **ไม่มี Cyberpunk/Horror style**
- **Animation ไม่เยอะเกินไป**
- **White space เยอะ**

## Technical Constraints

- **Database**: SQLite (ง่ายที่สุด)
- **Real-time**: Socket.io
- **Auth**: PIN (4-6 หลัก)
- **Deployment**: Vercel
- **Font**: เข้ากับธีม
