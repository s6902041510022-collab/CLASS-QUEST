# CLASS QUEST — บันทึกงานไว้ก่อนกลับมาทำต่อ

> อัปเดตล่าสุด: 28 ก.ย. 2026
> รอบนี้: หน้า "ผลวิเคราะห์รายคน" ฝั่งครู (สรุปความเข้าใจรายด่าน/รายข้อ + ปุ่มดูผลรายคน) + หน้าจับเวลาครูใหม่ (งบต่อข้อ ไม่โชว์ตัวเลขถอยหลังที่งง)
> เทสต์จริงใน browser ผ่าน (เคสถูก + เคสผิด) + `tsc` + `npm run build` ผ่าน + commit แล้ว

---

## 1. สถานะตอนนี้

### ✅ เสร็จและทดสอบผ่านแล้ว

**ฝั่งครู** (PIN = `1234`)
- login + ตั้งชื่อครู
- สร้างเกม (ชื่อ/วิชา/หัวข้อ/Boss)
- เพิ่ม-แก้-ลบ-จัดลำดับ Mission + คำถาม (พร้อมช่องตั้งเวลาต่อข้อ)
- จัดการรายชื่อนักเรียน
- ควบคุมห้องเล่น: **เริ่ม / หยุด / เปิดด่านบอส / จบเกม / ดูความคืบหน้า** (ปุ่มถัดไป-ย้อนกลับถูกลบแล้ว
  เพราะโหมด self-paced นักเรียนเลื่อนข้อเอง)
- **จับเวลา "ต่อข้อของทุกคน" (control กลางเกมได้):** ตั้ง / +30วิ / −30วิ / +1นาที / −1นาที / หยุด / เล่น /
  รีเซ็ต / ปิด — เปลี่ยนกลางเกมแล้วส่งผลถึงนักเรียนทันที (re-anchor ตาม `session.timeLeft`)
- วิเคราะห์ผล: รายเกม / รายคน / รายข้อ (แถวนักเรียนกดเข้าไปดู **หน้า "ผลวิเคราะห์รายคน" ฝั่งครู** — สรุปความเข้าใจ
  รายด่าน + รายข้อ ไม่มีปุ่มของนักเรียน เช่น "เล่นเกมอื่น")
- **Boss ด่าน:** สลับ "ด่านบอส" ในฟอร์ม Mission (👹 บังคับเล่นตอนสุดท้ายเสมอ)
  ดู HP บอสสด (คำนวณจาก `bossHits` × 200) + ประกาศชนะเมื่อ HP = 0
- ปุ่ม 🏠 กลับหน้าหลัก (ซ่อนที่หน้า dashboard)

**ฝั่งนักเรียน** (เลือกชื่อตัวเองจากรายชื่อที่ครูสร้าง)
- เข้าร่วม → ห้องรอ → เล่นควิซ → เห็นถูก/ผิด + เหตุผล + ประวัติของตัวเอง
- **โหมดเล่นเอง (self-paced):** ตอบถูก = เลื่อนข้อถัดไปทันที / ตอบผิด = เห็นเฉลย+คำอธิบาย
  แล้วกด "ไปข้อถัดไป →" เอง
- **จับเวลารายข้อต่อคน (แบบ Quizizz):** นับถอยหลังเมื่อไปถึงข้อนั้น / หมดเวลาข้อ = ข้ามข้อถัดไปอัตโนมัติ /
  ครูกดหยุดเวลา = นาฬิกาเด็กหยุดจริงๆ (freeze) แล้วเล่นต่อจากเดิม
- **โบนัสตอบเร็ว:** ตอบถูก + เลือกคำตอบเร็ว → ได้ XP พิเศษ ≤ 20 ตามสัดส่วนเวลาที่เหลือ (ตอบผิดไม่ได้โบนัส)
  ขึ้น toast "ถูกต้อง! +100 XP ⚡เร็ว +17"
- **ต่อสู้บอส:** ตอบคำถามบอส ตอบถูก = บอสเสีย HP (1 ข้อ = 200 HP) — เห็น HP bar
  + ข้อที่เหลือ + ฉากชนะเมื่อ HP บอสหมด
- ปุ่ม 🏠 กลับหน้าหลัก (lobby / เลือกชื่อ / รายชื่อ / หน้าเกม)

**ระบบ**
- 17 routes ตอบ 200 หมด, `npx tsc --noEmit` = 0 error, `npm run build` ผ่าน
- 2 โหมดเก็บข้อมูล (เลือกอัตโนมัติจาก env) — งานบอสเทสต์ผ่านทั้ง 2 โหมด
- เทสต์ 20 คน + 40 คนพร้อมกัน → ไม่มีข้อมูลหาย (รวมตอนตอบบอสพร้อมกัน)
- ข้อมูลรอด 100% หลังปิด-เปิด dev server
- `applyTimeAction` (add/sub) อัปเดต `timeLimit` ด้วย — นักเรียน re-anchor ตามเวลาใหม่กลางข้อ

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
                    players (+, players/advance), rooms, sessions, students, teams
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

---

## 8. โหมดเล่นเอง (self-paced) + โบนัสตอบเร็ว + จับเวลารายข้อต่อคน — ✅ เสร็จแล้ว

**กติกาที่ตัดสินไว้:** นักเรียนไปเอง ไม่ต้องพึ่งครูกดข้อถัดไป

| หัวข้อ | กติกา |
|---|---|
| ตอบถูก | เลื่อนข้อถัดไปทันที (`advancePlayerPosition` รันใน `/api/answers` แบบ atomic) |
| ตอบผิด | เห็นเฉลย + คำอธิบาย แล้วกด "ไปข้อถัดไป →" เอง (`POST /api/players/advance`) |
| หมดเวลาข้อ | ข้ามข้อถัดไปอัตโนมัติ (`POST /api/players/advance` เหมือนกัน) |
| จับเวลา | **นับเวลารายข้อต่อคน** (แบบ Quizizz) — งบเวลามาจาก `session.timeLimit` ("เวลาต่อข้อของทุกคน") |
| ครูกดตั้ง/+/− กลางเกม | `applyTimeAction` อัปเดต `timeLimit` ด้วย → นักเรียน re-anchor ตาม `session.timeLeft` ทันที (ยังอยู่ข้อเดิม ไม่ข้ามข้อ) |
| ครูกดหยุด/เล่น | หยุด = นาฬิกานักเรียน **freeze จริงๆ** (`frozenLeftRef`) → เล่นต่อ = นับต่อจากค่าที่ freeze ไว้ |
| โบนัสตอบเร็ว | `speedBonus = round(20 × (งบ − เวลาที่ใช้) / งบ)` **เฉพาะตอบถูก** (ตอบผิด 0) คำนวณจาก `timeTakenSec` ที่นักเรียนส่งมา (นับเฉพาะเวลาที่เล่นจริง ไม่รวมตอนครูกดหยุด) |

**ตำแหน่งรายคน** เก็บใน player record: `posMission`, `posQuestion`, `quizDone`, `bossPos`, `bossDone`
— `session.currentMissionIndex/currentQuestionIndex` ใช้เป็น global (สำหรับครู / เวลา) เท่านั้น

**Bug ที่เจอ + แก้ระหว่างเทสต์ browser:**

| อาการ | สาเหตุ | แก้ |
|---|---|---|
| หน้า analytics error `Cannot read properties of undefined (reading 'players')` | stale-data race ตอนสลับเกมระหว่าง poll | reset `data=null` เมื่อ `gameId` เปลี่ยน + guard อาร์เรย์ + แถวนักเรียนเป็น Link → `/student/me` |
| นักเรียนเห็น timer ข้อแรกแค่ `8 วิ` ทั้งที่ตั้ง 60 | `questionKey` คำนวณจาก pos default (0,0) ก่อน session โหลดมา → reset/re-anchor ยิงก่อนเวลาอันควร ไปยึดเวลาที่เหลือเก่าของนาฬิกา global | `questionKey` เป็น `''` ต่อเมื่อยังไม่มี `session` → reset effect ยิงพอถึงข้อจริงๆ |
| ครูกด +30 กลางข้อ → นักเรียน "หมดเวลา" ข้ามข้อทันที | สูตร re-anchor กลับด้าน: `startRef = now − serverLeft` ทำให้ `timeLeft ≈ 0` | `startRef = now − (budget − serverLeft)` → แสดงเวลาที่เหลือจริง ยังอยู่ข้อเดิม |
| ครูกดเล่นต่อ → นาฬิกาเริ่มจาก `งบ − เหลือ` (ต่ำกว่าเดิม) | สูตร resume กลับด้าน | `startRef = now − (budget − frozen)` |
| ครูกดหยุด → นาฬิกาเด็กยังนับต่อ | freeze เดิมเป็น no-op | `frozenLeftRef` + display ใช้ค่า freeze เมื่อไม่ null |

**จุดที่แก้ไป (รอบนี้):**

| ไฟล์ | ทำอะไร |
|---|---|
| `src/lib/db.ts` | `advancePlayerPosition()` (บน memory ก่อน `db.write()`), `applyTimeAction` add/sub → อัปเดต `timeLimit` ด้วย |
| `src/app/api/answers/route.ts` | ตอบถูก = advance แบบ atomic; รับ `timeTakenSec` → คำนวณ `speedBonus` → เก็บ `bonus` ใน answer + คืนค่า; `alreadyAnswered` คืนข้อมูลเต็ม |
| `src/app/api/players/advance/route.ts` | **(ใหม่)** นักเรียนเลื่อนข้อเอง (ตอบผิด / หมดเวลา) |
| `src/app/api/players/route.ts` | เพิ่ม `GET /api/players?id=` (แก้ import `getDb`) |
| `src/lib/utils.ts` | `BONUS_MAX_XP = 20` |
| `src/app/student/game/[id]/page.tsx` | เขียนใหม่: render จาก player pos, timer รายคน (reset/re-anchor/freeze), timeout auto-advance, ส่ง `timeTakenSec`, toast โบนัสตอบเร็ว |
| `src/app/teacher/game/[id]/page.tsx` | ลบ goNext/goBack, เพิ่ม "⚔️ เปิดด่านบอส", สถิติ "ควิซครบ/เริ่มแล้ว + นาฬิกา", progressLabel รายคน |
| `src/app/teacher/analytics/page.tsx` | แก้ stale-data race |
| `src/components/TeacherHeader.tsx`, `HomeButton.tsx` | 🏠 กลับหน้าหลัก (ครู + นักเรียน) |

**เทสต์ browser ที่ผ่าน:** ตอบถูก→เลื่อนทันที + "ถูกต้อง! +100 XP ⚡เร็ว +17" (โบนัส 17/18 ถูก) / ตอบผิด→เฉลย+ปุ่ม "ไปข้อถัดไป →" / หมดเวลา 8 วิ→ข้ามอัตโนมัติ / ครูกด +30 กลางข้อ→timer นักเรียนกระโดดตาม (นักเรียนยังอยู่ข้อเดิม) / ครูกดหยุด→นาฬิกา freeze (ค้างเท่าเดิม 3.5 วิ) / เล่นต่อ→นับต่อจาก freeze / บอสสู้ครบ (HP 500→0, XP 1226) / ไม่มี console error

---

## 9. หน้า "ผลวิเคราะห์รายคน" ฝั่งครู + หน้าจับเวลาครูใหม่ — ✅ เสร็จแล้ว

**ต้นตอที่ผู้ใช้เจอ:** ครูกดดูผลนักเรียนใน analytics → ถูกพาไป `/student/me` (หน้าของนักเรียน) ซึ่งมีปุ่ม "เล่นเกมอื่น"
→ ครูหลุดเข้า flow นักเรียน (ขึ้น lobby "รอครูเริ่มเกม...") ไม่ได้แยกฝั่งครู/นักเรียน

**ที่แก้:**

| ไฟล์ | ทำอะไร |
|---|---|
| `src/app/teacher/student/[id]/page.tsx` | **(ใหม่)** หน้า "ผลวิเคราะห์รายคน" ฝั่งครู อ่านอย่างเดียว: สถิติรวม (XP/ครั้ง/ถูก/แม่นยำ), เลือกรอบถ้าเล่นหลายครั้ง, **📊 สรุปความเข้าใจรายด่าน** (แถบ accuracy + ป้าย 💪 เก่ง / 📚 ควรฝึก + ประโยคสรุป + โบนัสตอบเร็ว), **🔎 คำตอบรายข้อ** (✅/❌, คำตอบ+ตัวเลือกเป็นตัวอักษร, เฉลย+คำอธิบาย 💡, XP+โบนัส) — **ไม่มีปุ่ม "เล่นเกมอื่น"** มีปุ่มกลับ analytics |
| `src/app/teacher/analytics/page.tsx` | แถวนักเรียน (2 จุด) → `/teacher/student/{id}` (+ `?gameId=` ในโหมดรายเกม) แทน `/student/me` |
| `src/app/teacher/game/[id]/page.tsx` | หน้าจับเวลาครู: **เอาเลขถอยหลังกลมๆ ที่งงออก** → โชว์ "งบเวลาต่อข้อ" (`60 วิ`) + สถานะ (⏳ กำลังจับเวลา / ⏸️ หยุดชั่วคราว) + ปุ่มควบคุมเดิมครบ; สถิติบนสุดช่อง 3 = `60 วิ / ⏱️ เวลาต่อข้อ`; รายชื่อผู้เล่นมีปุ่ม **"📊 ดูผลวิเคราะห์"** → หน้าครูรายคน |

**หมายเหตุการแมปข้อมูล:** mission ใช้ฟิลด์ `title` (ไม่ใช่ `name`) — หน้าใหม่ join `answers.missionId → missions[].id` (ผ่าน `/api/missions?gameId=`) เพื่อเอาชื่อด่าน + ตัวเลือกคำตอบเป็นตัวอักษร

**เทสต์ browser ที่ผ่าน:** หน้า `/teacher/student/demo-s-1?gameId=demo-game-1` แสดงสรุปครบ (ถูก 8/8, 3 ด่าน 100%, ป้ายเก่ง, โบนัส +139) / เคสตอบผิดชั่วคราว → แถบ 0% + ป้าย "📚 ควรฝึก" + ❌ แสดง "ตอบ C (RAM) / คำตอบที่ถูกคือ A (Register) / 💡 ..." (คืน db ให้แล้วหลังเทสต์) / analytics ลิงก์ → `/teacher/student/...` / หน้าเกมครูโชว์ `60 วิ ⏸️ เวลาหยุด` + ปุ่ม "ดูผลวิเคราะห์" ในรายชื่อผู้เล่น / `tsc --noEmit` ผ่าน

---
