# CLASS QUEST — บันทึกงานไว้ก่อนกลับมาทำต่อ

> อัปเดตล่าสุด: 28 ก.ย. 2026
> งานบอส "นักเรียนตอบได้" เสร็จ + เทสต์ผ่าน 2 โหมดแล้ว — commit `25b16fd`

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
- **Boss ด่าน:** สลับ "ด่านบอส" ในฟอร์ม Mission (👹 บังคับเล่นตอนสุดท้ายเสมอ)
  ดู HP บอสสด (คำนวณจาก `bossHits` × 200) + ประกาศชนะเมื่อ HP = 0

**ฝั่งนักเรียน** (เลือกชื่อตัวเองจากรายชื่อที่ครูสร้าง)
- เข้าร่วม → ห้องรอ → เล่นควิซ → เห็นถูก/ผิด + เหตุผล + ประวัติของตัวเอง
- เห็นแถบนับถอยหลัง + ถูกล็อกเมื่อหมดเวลา (ครูบวกเวลากลับได้ ปลดล็อกเอง)
- **ต่อสู้บอส:** ตอบคำถามบอส ตอบถูก = บอสเสีย HP (ตอนนี้ 1 ข้อ = 200 HP) — เห็น HP bar
  + ข้อที่เหลือ + ฉากชนะเมื่อ HP บอสหมด

**ระบบ**
- 14 routes ตอบ 200 หมด, `npx tsc --noEmit` = 0 error, `npm run build` ผ่าน
- 2 โหมดเก็บข้อมูล (เลือกอัตโนมัติจาก env) — **งานบอสเทสต์ผ่านทั้ง 2 โหมด**
- เทสต์ 20 คน + 40 คนพร้อมกัน → ไม่มีข้อมูลหาย (รวมตอนตอบบอสพร้อมกัน)
- ข้อมูลรอด 100% หลังปิด-เปิด dev server

### ❌ ยังไม่ได้ทำ

| # | เรื่อง | หมายเหตุ |
|---|---|---|
| 1 | ขึ้น GitHub | ค้างรอ `gh auth login` (ต้องรันเอง) |
| 2 | Deploy Vercel | ค้างรอ repo + ค่า KV |
| 3 | เนื้อหาเกมจริง | มีแค่ตัวอย่าง 1 เกม (`demo-game-1`): 2 ด่านควิซ + 1 ด่านบอส |
| 4 | README / เอกสารครู | ยังไม่ได้เขียน |
| 5 | ทดสอบมือถือจริง | ที่ผ่านมาเป็นการจำลองผ่าน API |

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

## 4. Boss ให้นักเรียนตอบได้ — ✅ เสร็จแล้ว

**สิ่งที่ทำ:** นักเรียนตอบคำถามบอสได้เลย ตอบถูก = บอสเสีย HP ครูกดปุ่ม "โจมตี" แบบเดิมมีไว้เฉพาะเกมเก่าที่ไม่มีด่านบอส (legacy fallback)

**กติกาที่ตัดสินไว้:**
- ตอบถูก → บอสเสีย `BOSS_DAMAGE_PER_CORRECT` = **200 HP** (ค่าเดียวใน `src/lib/utils.ts` ใช้ทุกหน้า)
- ตอบผิด → บอสไม่เสีย HP แต่ยังได้คะแนนตามปกติ (ข้อบอสคือคำถามธรรมดา)
- HP บอสหมด → ปิดรอบ + `rollUp()` เข้าสถิติถาวร (คำตอบบอสถูกนับในสถิติ/วิเคราะห์อัตโนมัติ)
- Mission บอสเล่นตอนสุดท้ายเสมอ — `sortMissionsForPlay()` เรียงด่านควิซก่อน บอสต่อท้าย (เซิร์ฟเวอร์ + หน้าครู + หน้านักเรียนใช้ตัวเดียวกัน)
- โหมดเก่า (ไม่มี Mission บอส): คง `attackBoss` ครูกดเอง 100 HP + นักเรียนเห็น "รอครูสั่งโจมตี"

**ข้อมูล HP กันหายตอนตอบพร้อมกัน:**
- **`session.bossHits[]`** (array `{id, questionId, playerId, at}`) — เก็บประวัติโจมตีแทน scalar
  merge ปลอดภัยเพราะมี id; `bossHpLeft = max(0, bossHp − hits×200)` คำนวณจากความยาว array เสมอ
- **ประกาศชนะหลัง merge เท่านั้น** — หลัง `db.write()` อ่านข้อมูลรวมอีกครั้ง ถ้า HP ≤ 0 → `completeSessionWithRollup(gameId)`
  (เดิมตรวจจาก snapshot ก่อน merge จะพลาดจบเกมเมื่อตอบพร้อมกัน)

**Bug ที่เจอระหว่างเทสต์ Redis (file mode ตรวจไม่เจอ):**
- บอส HP ถึง 0 **ก่อนที่คำตอบที่ส่งพร้อมกันจะมาถึงครบ** (เช่น HP เหลือ 200 แล้วคนแรกของ batch ยิงอีก 200 =
  0 พอดี) → `completeSessionWithRollup` รันก่อน → rollUp ได้คำตอบหายไปหลายข้อ
- **วิธีแก้ = "ช่วงลมจับ" (settle window):** HP ถึง 0 ครั้งแรก → ตีตรา `session.bossDefeatedAt`
  (ยังไม่จบ ให้คำตอบที่ลอยมาไม่ถูกทิ้ง) → เมื่อเลย `BOSS_SETTLE_MS` (2.5 วิ) → `completeSessionWithRollup`
- จุดที่เช็ค: `answers/route.ts` หลังทุกคำตอบบอส + `sessions/route.ts` GET (ครู/นักเรียน poll มาเรื่อย ๆ
  เป็นตัวปิดรอบสำรอง)

**จุดที่แก้ไป:**
| ไฟล์ | ทำอะไร |
|---|---|
| `src/types/index.ts` | `Mission.type` เพิ่ม `'boss'` + `BossHit` + `bossHits`/`bossDefeatedAt` ใน `GameSession` |
| `src/lib/db.ts` | `getQuizMissions()`, `sortMissionsForPlay()`, `sessionBossHpLeft()`, `completeSessionWithRollup()`, `settleBossDefeat()`, `resetTimerForQuestion()` เฟส boss, `updateSessionLive()` คืน `bossHpLeft`, export `currentSessionIndex` |
| `src/lib/utils.ts` | `BOSS_DAMAGE_PER_CORRECT = 200` |
| `src/app/api/answers/route.ts` | write คำตอบ + bossHit ในรอบเดียว, ตรวจผลหลัง merge, settle window |
| `src/app/api/sessions/route.ts` | GET เรียก `settleBossDefeat()` (ตัวปิดรอบสำรอง) |
| `src/app/teacher/game/[id]/page.tsx` | flow ด่านบอส + HP bar + `.bossHpLeft` |
| `src/app/student/game/[id]/page.tsx` | การ์ดบอส (HP bar + คำถาม + ตอบ + ฉากชนะ) |
| `src/app/teacher/missions/page.tsx` | สลับ 📚 / 👹 + badge BOSS |
| `data/db.default.json` | `demo-boss-mission` (order 3, demo bossHp 500 = 3 ข้อถูกชนะ) |

**เทสต์ที่เพิ่ม:** `C:\Users\Namex\AppData\Local\Temp\opencode\test-boss.js` — 24 เคส:
สร้าง student ใหม่ทุกชุดกันสถิติเก่า, ใช้ `game.id` จริงเป็น GID, 4 ถูก q1 → HP 200,
คำถามบอสข้อ 2 ตอบถูกพร้อมกัน 6 คน → บอสตาย + rollUp + analytics (ผ่านทั้งโหมดไฟล์และ Redis)

---

## 5. เทสต์ที่ต้องรันซ้ำก่อน deploy

| สคริปต์ | ตรวจอะไร | ผลล่าสุด (2 โหมด) |
|---|---|---|
| `C:\Users\Namex\AppData\Local\Temp\opencode\test-boss.js` | ด่านบอส: ตอบถูกลด HP, ชนะพร้อมกัน, rollUp | 24/24 ✅ |
| `C:\Users\Namex\AppData\Local\Temp\opencode\test-timer.js` | นาฬิกา 26 เคส | 26/26 ✅ |
| `C:\Users\Namex\AppData\Local\Temp\opencode\test-load.js` | 20 คนพร้อมกัน, ไม่มีข้อมูลหาย | 20/20 ✅ |
| `C:\Users\Namex\AppData\Local\Temp\opencode\test-stress.js` | 40 คน × 3 ข้อ | 40/40 ✅ |
| `C:\Users\Namex\AppData\Local\Temp\opencode\mock-upstash.js` | mock Upstash REST (พอร์ต 6399) ใช้เทสต์โหมด Redis | — |

**ต้องรันทั้ง 2 โหมด:** ในโหมด Redis ให้รีสตาร์ท mock ก่อน `test-load` เสมอ
(มันใช้ `students[0..19]` ที่มีสถิติสะสมได้ → ต้องเริ่มจาก state เปล่าเหมือน reset `db.json` ในโหมดไฟล์)
`test-stress` สร้าง student + session ใหม่เอง (`force: true`) ไม่ต้องรีสตาร์ท
`test-boss` สร้าง student ใหม่ทุกชุด ไม่ต้องรีสตาร์ท

> **สำคัญ:** `test-boss` ต้องเช็คตาม `players[].studentId` ไม่ใช่สมมุติว่า `players[i]` เรียงตรง `students[i]`
> (getPlayers เรียงต่างจากตอนสร้าง — ถ้าเช็คผิดจะ FAIL ทั้งที่แอปถูก)

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
- **HP บอสห้ามเก็บเป็น scalar ที่บวกลบ** — ใช้ `session.bossHits[]` array + คำนวณ `bossHpLeft` เสมอ
  และประกาศชนะ**หลัง merge** เท่านั้น (ดูหัวข้อ 4 — เจอ bug ตายก่อนกำหนดเมื่อตอบพร้อมกัน)

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
