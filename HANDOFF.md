# CLASS QUEST — บันทึกงานไว้ก่อนกลับมาทำต่อ

> อัปเดตล่าสุด: 28 ก.ย. 2026
> งานทั้งหมด commit ไว้แล้วที่ commit `f1a6de7` — เน็ตหมดก็ไม่หาย

---

## 1. สถานะตอนนี้

### ✅ เสร็จและทดสอบผ่านแล้ว

**ฝั่งครู** (PIN = `1234`)
- login + ตั้งชื่อครู
- สร้างเกม (ชื่อ/วิชา/หัวข้อ/Boss)
- เพิ่ม-แก้-ลบ-จัดลำดับ Mission + คำถาม (พร้อมช่องตั้งเวลาต่อข้อ)
- จัดการรายชื่อนักเรียน
- ควบคุมห้องเล่น: เริ่ม/ถัดไป/ย้อนกลับ/หยุด/จบเกม
- **จับเวลา**: ตั้ง / +30วิ / −30วิ / +1นาที / −1นาที / หยุด / เล่น / รีเซ็ต / ปิด
- วิเคราะห์ผล: รายเกม / รายคน / รายข้อ

**ฝั่งนักเรียน** (เลือกชื่อตัวเองจากรายชื่อที่ครูสร้าง)
- เข้าร่วม → ห้องรอ → เล่นควิซ → เห็นถูก/ผิด + เหตุผล + ประวัติของตัวเอง
- เห็นแถบนับถอยหลัง + ถูกล็อกเมื่อหมดเวลา (ครูบวกเวลากลับได้ ปลดล็อกเอง)

**ระบบ**
- 14 routes ตอบ 200 หมด, `npx tsc --noEmit` = 0 error, `npm run build` ผ่าน
- 2 โหมดเก็บข้อมูล (เลือกอัตโนมัติจาก env) ทดสอบผ่านทั้งคู่
- เทสต์ 20 คน + 40 คนพร้อมกัน → ไม่มีข้อมูลหาย
- ข้อมูลรอด 100% หลังปิด-เปิด dev server

### ❌ ยังไม่ได้ทำ

| # | เรื่อง | หมายเหตุ |
|---|---|---|
| 1 | ขึ้น GitHub | ค้างรอ `gh auth login` (ต้องรันเอง) |
| 2 | Deploy Vercel | ค้างรอ repo + ค่า KV |
| 3 | **Boss ให้นักเรียนตอบได้** | ออกแบบไว้แล้ว ดูหัวข้อ 4 |
| 4 | เนื้อหาเกมจริง | มีแค่ตัวอย่าง 1 เกม (`demo-game-1`) 2 ด่าน |
| 5 | README / เอกสารครู | ยังไม่ได้เขียน |
| 6 | ทดสอบมือถือจริง | ที่ผ่านมาเป็นการจำลองผ่าน API |

---

## 2. วิธีรัน

```powershell
$env:PATH = "C:\Program Files\nodejs;C:\Program Files\Git\cmd;$env:PATH"

# โหมดไฟล์ (คอมพิวเตอร์ครู) — ไม่ต้องตั้งอะไร
npm.cmd run dev        # http://localhost:3000

# โหมด Redis (เหมือนบน Vercel)
$env:KV_REST_API_URL = "..."
$env:KV_REST_API_TOKEN = "..."
npm.cmd run dev
```

รีเซ็ตข้อมูลทดสอบ: `Copy-Item data\db.default.json data\db.json -Force`

**เช็คว่าใช้โหมดไหน:** เปิด `http://localhost:3000/api/health`
จะได้ `{"ok":true,"store":"...","usingKv":true|false,"counts":{...}}`

> ⚠️ **ปิด dev server ก่อน `npm run build` เสมอ** — build ทับ `.next` ของ dev server
> ทำให้ error `Cannot find module './xxx.js'`

---

## 3. ขึ้น GitHub + Vercel (ทำตอนเน็ตกลับมา)

**ขั้นที่ 1 — ต้องรันเอง**
```powershell
gh auth login
```
เลือก GitHub.com → HTTPS → เข้าเว็บยืนยัน

**ขั้นที่ 2 — บอกผม** ผมจะรัน `git add` + `gh repo create` + push ให้

**ขั้นที่ 3 — Vercel (ต้องการค่า 2 อันนี้)**
1. vercel.com → Storage → Create Database → **KV (Upstash Redis)**
2. Project Settings → Environment Variables เพิ่ม
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
3. ส่งค่ามาให้ผม หรือใส่เองใน Vercel ก็ได้

**ตัวแปรอื่น (มีค่า default แล้ว ไม่ต้องตั้ง):** `KV_DB_KEY` = `classquest:db`

> ⚠️ **โควตา Redis ฟรี = 10,000 คำสั่ง/วัน** ลดการใช้แล้วด้วย:
> cache 2 วินาที, polling แบบ adaptive (2 วิ → 5 วิ เมื่อข้อไม่เปลี่ยน),
> lobby 3 วิ, ครู 2 วิ — ห้อง 40 คนเล่นจบรอบนึงใช้ ~1,500 คำสั่ง

---

## 4. แผน: Boss ให้นักเรียนตอบได้

**ปัญหาปัจจุบัน:** เข้าเฟส Boss แล้วนักเรียนได้แค่ดู ไม่ได้ตอบ
ครูต้องกดปุ่ม "โจมตี -100 HP" เอง (`teacher/game/[id]/page.tsx` → `attackBoss`)
สเปกเดิมที่ผู้ใช้ให้คือ "Boss: Simple (HP + **คำถาม**)"

**แนวทางที่ออกแบบไว้** (ยังไม่ได้ลงมือ — ใช้ต่อได้เลย)

1. **ใช้ Mission ที่มีอยู่แล้วเป็นคำถามบอส** — ไม่ต้องเพิ่มตารางข้อมูลใหม่
   - เพิ่ม `Mission.type` ค่า `'boss'` (ตอนนี้ union ใน `types/index.ts:31` ยังไม่มี)
   - ในหน้า `teacher/missions` เพิ่มตัวเลือก "ด่านบอส" ในฟอร์ม Mission
   - `getMissions()` เดิมคืนทั้งหมด (ครูต้องเห็น) → เพิ่ม `getQuizMissions()` ที่ตัด type `'boss'` ออก ไว้ให้ flow เล่นปกติใช้

2. **จุดที่ต้องแก้**
   | ไฟล์ | ต้องทำอะไร |
   |---|---|
   | `src/lib/db.ts` | เพิ่ม `getQuizMissions()`; ใน `updateSessionLive()` เพิ่ม branch `rest.status === 'boss'` เพื่อรีเซ็ตนาฬิกาตาม Mission บอส |
   | `src/app/api/answers/route.ts` | ถ้า session เป็น boss และตอบถูก → ลด `session.bossHp` (คิดใน write เดียวกับคำตอบ ไม่ต้องเพิ่มรอบเขียน) |
   | `src/app/teacher/game/[id]/page.tsx` | `goNext()` เข้า boss → ตั้ง `currentMissionIndex` = index ของ Mission บอส, `currentQuestionIndex: 0`; ปุ่มในเฟส boss เปลี่ยนจาก "โจมตี" เป็น "ถัดไป" |
   | `src/app/student/game/[id]/page.tsx` | เฟส boss ต้องแสดงคำถาม + ปุ่มตอบ (ตอนนี้ return ออกไปก่อนถึง UI คำถาม) |
   | `src/types/index.ts` | เพิ่ม `'boss'` ใน `Mission['type']` |

3. **กติกาที่ตัดสินไว้**
   - ตอบถูก → บอสเสีย HP (เช่น 200) + ได้ XP
   - ตอบผิด → บอสไม่เสีย HP
   - HP = 0 → `status: 'completed'` (นักเรียนชนะ)
   - คำถามบอสหมดแต่บอสยังมีชีวิต → ครูกด "จบเกม" เอง
   - **ไม่ต้องแยกตารางเก็บคำตอบบอส** — `rollUp()` อ่านจาก `player.answers` อยู่แล้ว
     คำตอบบอสจึงถูกนับในสถิติ/ประวัติ/วิเคราะห์อัตโนมัติ

4. **จุดที่ต้องระวัง**
   - `updatePlayer()` เขียนทีละคน ถ้า 40 คนตอบถูกพร้อมกัน ต้องไม่ทำ HP ติดลบ
     (merge 3-way ใน `db.ts` ช่วยได้ แต่ต้อง **คำนวณจากค่าล่าสุดที่อ่านมา** ไม่ใช่ค่าที่ client ส่งมา)
   - `/api/answers` ตอนนี้เรียก `getDb()` แล้ว `updatePlayer()` ซึ่งเรียก `getDb()` อีกครั้ง
     — ถ้าจะลด HP ด้วย ให้เขียนรวมใน `db.write()` ครั้งเดียว

---

## 5. เทสต์ที่ต้องรันซ้ำก่อน deploy

| สคริปต์ | ตรวจอะไร |
|---|---|
| `C:\Users\Namex\AppData\Local\Temp\opencode\test-load.js` | 20 คนพร้อมกัน, ไม่มีข้อมูลหาย |
| `C:\Users\Namex\AppData\Local\Temp\opencode\test-stress.js` | 40 คน × 3 ข้อ |
| `C:\Users\Namex\AppData\Local\Temp\opencode\test-timer.js` | นาฬิกา 26 เคส |
| `C:\Users\Namex\AppData\Local\Temp\opencode\mock-upstash.js` | mock Upstash REST (พอร์ต 6399) ใช้เทสต์โหมด Redis |

ทั้งหมดต้องรันทั้ง 2 โหมด (ไฟล์ + Redis)

---

## 6. ข้อควรระวัง (เจอมาแล้ว อย่าเพิ่งเจอซ้ำ)

- **Deadlock ในคิวเขียน** — เคยเป็น `getDb().write()` เรียก `serialize()` แล้ว
  `fileBackend.locked` ก็เรียก `serialize()` อีกชั้น → ค้าง 299 วินาที
  **กติกา: ชั้น `serialize()` มีได้ที่เดียว** (ใน `write()`) backend ต้องไม่ซ้อนอีก
- **`data/db.json` ต้องเป็น UTF-8 ไม่มี BOM**
- **ห้ามใช้ PowerShell `Get-Content -Raw` + `WriteAllText`** กับไฟล์ภาษาไทย
  round-trip ผ่าน codepage 874 แล้วพัง — ใช้ tool `edit`/`write` เท่านั้น
- ใช้ `npm.cmd` / `npx.cmd` บน Windows
- `/student/results` และ `/api/play-records` **ถูกลบแล้ว** — อย่าอ้างถึง
- ข้อมูลผูกกับ **student record** ไม่ใช่ device — `players` ผูกกับ `sessionId`
  ประวัติ derive จาก `players` ผ่าน `getStudentHistory()` ไม่มี `playRecords` แล้ว

---

## 7. โครงสร้างโปรเจกต์

```
src/
  app/
    api/            analytics, answers, auth, games, health, missions,
                    players, rooms, sessions, students, teams
    student/        join, lobby, game/[id], me
    teacher/        login, dashboard, games, create, missions,
                    students, game/[id], analytics, settings
  lib/
    db.ts           ⭐ ชั้นข้อมูลทั้งหมด (Backend interface, merge, rollUp, นาฬิกา)
    game-engine.ts  (เก่า ใช้น้อย — logic อยู่ใน db.ts แล้ว)
    auth.ts, utils.ts, constants.ts
  types/index.ts
data/
  db.default.json   seed (เกมตัวอย่าง + roster 4 คน) — commit ไว้ ห้าม ignore
  db.json           ข้อมูลจริง — gitignore แล้ว
```
