// ทดสอบแคชสถานะครูฝั่ง client (src/lib/auth.ts)
//
// ทำไมต้องมีไฟล์นี้
// ตอนใช้งานจริงเจอบั๊กที่หน้าเว็บ "เชื่อว่าล็อกอินอยู่" ทั้งที่เซิร์ฟเวอร์ตัดเซสชันทิ้งแล้ว
//   - เปลี่ยนรหัสผ่านเสร็จ → หน้าล็อกอินเห็นแคชเก่า → ดันกลับไป dashboard ที่โหลดไม่ได้
//   - เพิ่งล็อกอินเสร็จ → หน้าล็อกอินแคช "ไม่ได้ล็อกอิน" → ดันกลับมาหน้าล็อกอินวนไม่จบ
// ทั้งสองเคสหน้าเว็บแก้แล้ว (ดู forgetTeacherSession ใน settings/page.tsx
// และ getTeacherSession(true) ใน login/page.tsx) แต่การแก้ที่ "หน้าเว็บ"
// ใครก็เขียนพังได้โดยไม่รู้ตัว และเทสต์ E2E จับไม่ได้ เพราะมันเป็นเรื่อง
// ในหน่วยความจำของเบราว์เซอร์ ไม่ใช่สิ่งที่ API จะเห็น
//
// ไฟล์นี้จึงทดสอบ "สัญญา" ของแคชตรง ๆ แทนที่จะไปจับว่าหน้าไหนเรียกอะไร
// ถ้าวันหนึ่งใครไปทำให้แคชอยู่ตลอดชีวิตของหน้า (ตัด TTL ทิ้ง) เทสต์นี้ต้องแดง
//
// รัน: node --import ./scripts/register-ts.mjs --test scripts/auth-cache.test.mjs

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// src/lib/auth.ts มี `typeof window === 'undefined'` เป็นด่านแรก
// ต้องหลอกว่าเป็นเบราว์เซอร์ก่อน ไม่งั้นทุกฟังก์ชันจะคืน null ทันที
// ต้องชี้มาที่ globalThis ตัวเดียวกันด้วย ไม่งั้นโค้ดที่อ่าน window.localStorage
// จะไม่เห็นตัวแทนที่เทสต์ไปตั้งไว้ใน globalThis
globalThis.window = globalThis;

/** โมดูลคงที่ทั้งไฟล์ — แคชเป็นตัวแปรระดับโมดูล เลยล้างด้วย forgetTeacherSession() แทน */
const auth = await import('../src/lib/auth.ts');

let calls;      // จำนวนครั้งที่ยิง /api/auth
let signedIn;   // เซิร์ฟเวอร์จะตอบว่าล็อกอินอยู่ไหม
let removed;    // คีย์ใน localStorage ที่ถูกลบ

beforeEach(() => {
  calls = 0;
  signedIn = true;
  removed = [];

  globalThis.localStorage = {
    removeItem: (k) => removed.push(k),
    getItem: () => null,
    setItem: () => {},
  };
  globalThis.fetch = async (url) => {
    if (url === '/api/auth') calls += 1;
    return {
      json: async () => ({
        success: true,
        data: signedIn ? { name: 'ครูเอ', avatar: '👨‍🏫', username: 'krua' } : null,
      }),
    };
  };

  // ล้าง state ของโมดูลให้เหมือนหน้าเว็บที่เพิ่งเปิดใหม่
  auth.forgetTeacherSession();
  removed.length = 0; // นับเฉพาะที่หน้าเว็บทำเองหลังจากนี้
});

test('รอบแรกต้องถามเซิร์ฟเวอร์จริง', async () => {
  const s = await auth.getTeacherSession();
  assert.equal(s?.username, 'krua');
  assert.equal(calls, 1);
});

test('component หลายตัวในหน้าเดียวกันถามพร้อมกัน ต้องยิง /api/auth ครั้งเดียว', async () => {
  const results = await Promise.all([
    auth.getTeacherSession(),
    auth.getTeacherSession(),
    auth.getTeacherSession(),
  ]);
  assert.equal(calls, 1, 'ยิงซ้ำเกินจำเป็น — เพิ่มภาระเซิร์ฟเวอร์เปล่า ๆ');
  assert.ok(results.every((r) => r?.username === 'krua'));
});

test('force=true ต้องถามใหม่เสมอ (ใช้หลังเพิ่งเข้าสู่ระบบ)', async () => {
  // เปิดหน้าล็อกอินตอนยังไม่ได้ล็อกอิน -> แคชเก็บค่า "ไม่ได้ล็อกอิน"
  signedIn = false;
  assert.equal(await auth.getTeacherSession(), null);
  assert.equal(calls, 1);

  // ล็อกอินสำเร็จ แล้วหน้า login สั่งให้รีเฟรช
  signedIn = true;
  const after = await auth.getTeacherSession(true);
  assert.equal(calls, 2, 'force ต้องข้ามแคชและยิงใหม่');
  assert.equal(
    after?.username,
    'krua',
    '⚠️ หลังล็อกอินสำเร็จ ยังเชื่อว่าไม่ได้ล็อกอิน — จะถูกดันกลับหน้าล็อกอินวนไม่จบ'
  );
});

test('คำขอที่ค้างอยู่แล้วหมดอายุทิ้ง ไม่เขียนทับสถานะใหม่', async () => {
  let release;
  const gate = new Promise((r) => {
    release = r;
  });
  let seenAtCall1 = true;
  globalThis.fetch = async (url) => {
    if (url === '/api/auth') {
      calls += 1;
      if (calls === 1) {
        // ตอบช้า ๆ ด้วยข้อมูลของตอนที่ยังล็อกอินอยู่
        const stale = { name: 'เก่า', avatar: '👴', username: 'krua' };
        await gate;
        return { json: async () => ({ success: true, data: seenAtCall1 ? stale : null }) };
      }
    }
    // หลังจากนี้เซสชันถูกตัดไปแล้ว (ครูกดออกจากระบบ)
    return { json: async () => ({ success: true, data: null }) };
  };

  const pending = auth.getTeacherSession();

  // ครูกดออกจากระบบก่อนคำตอบจะกลับมา (ออกจากระบบ / เปลี่ยนรหัสผ่าน)
  auth.forgetTeacherSession();
  seenAtCall1 = false;
  release();

  assert.equal(
    await pending,
    null,
    '⚠️ คำตอบที่ค้างอยู่เขียนทับสถานะใหม่ — หน้าเว็บจะเชื่อว่ายังล็อกอินอยู่ทั้งที่ออกไปแล้ว'
  );

  // และครั้งถัดไปต้องถามเซิร์ฟเวอร์ใหม่ ไม่ใช่ตอบด้วยของเก่าที่เพิ่งทิ้ง
  assert.equal(await auth.getTeacherSession(), null);
  assert.equal(calls, 2);
});

test('forgetTeacherSession() ต้องล้างแคช ไม่ใช่แค่เรียกเซิร์ฟเวอร์', async () => {
  await auth.getTeacherSession();
  assert.equal(calls, 1);

  auth.forgetTeacherSession();

  // เซสชันถูกเซิร์ฟเวอร์ตัดไปแล้ว (เปลี่ยนรหัสผ่าน) — ต้องถามใหม่แล้วเห็นความจริง
  signedIn = false;
  assert.equal(
    await auth.getTeacherSession(),
    null,
    '⚠️ ยังเชื่อแคชเก่าว่าล็อกอินอยู่ — หน้าถัดไปจะพาไปหน้าที่ล้มเหลว'
  );
  assert.equal(calls, 2);
});

test('forgetTeacherSession() ต้องไม่ยิงเน็ต (เซสชันตายแล้ว ยิง DELETE ได้ 401 เปล่า ๆ)', async () => {
  await auth.getTeacherSession();
  const before = calls;

  auth.forgetTeacherSession();

  assert.equal(calls, before, 'ไม่ควรยิงอะไรตอนลืนแคช');
});

test('clearTeacherSession() ต้องสั่งลบเซสชันที่เซิร์ฟเวอร์ ไม่ใช่แค่ล้างในเบราว์เซอร์', async () => {
  const seen = [];
  globalThis.fetch = async (url, opts) => {
    seen.push(`${opts?.method || 'GET'} ${url}`);
    return { json: async () => ({ success: true, data: null }) };
  };

  await auth.clearTeacherSession();

  assert.ok(
    seen.includes('DELETE /api/auth'),
    'ต้องยิง DELETE /api/auth — ไม่งั้นคนที่ขโมยโทเคนไปยังเข้าได้อีก 30 วัน'
  );
});

test('ถ้าเครื่องยังไม่ล็อกอิน แคชค่า null ไว้ได้ (ไม่ยิงทุก component)', async () => {
  signedIn = false;
  assert.equal(await auth.getTeacherSession(), null);
  assert.equal(await auth.getTeacherSession(), null);
  assert.equal(calls, 1, 'หน้าที่ไม่ล็อกอินก็ไม่ควรถามซ้ำทุก component');
});

test('ต่อเน็ตไม่ได้ ต้องถือว่าไม่ได้ล็อกอิน (ไม่ค้างหน้าจอโหลด)', async () => {
  globalThis.fetch = async () => {
    throw new Error('offline');
  };
  assert.equal(await auth.getTeacherSession(), null);
});

test('ล้าง localStorage เก่าที่เคยเก็บสถานะครูไว้ตอนถามสถานะครั้งแรก', async () => {
  await auth.getTeacherSession();
  assert.ok(
    removed.includes('cq_teacher_session'),
    'ต้องล้างของเก่า ไม่งั้นจะมีตัวแปลงค้างใน localStorage ที่ไม่มีใครใช้'
  );
});

test('เข้า localStorage ไม่ได้ (โหมดส่วนตัวของเบราว์เซอร์) ต้องไม่พัง', async () => {
  globalThis.localStorage = {
    getItem() {
      throw new Error('SecurityError');
    },
    setItem() {
      throw new Error('SecurityError');
    },
    removeItem() {
      throw new Error('SecurityError');
    },
  };
  const s = await auth.getTeacherSession();
  assert.equal(s?.username, 'krua', 'ยังต้องถามเซิร์ฟเวอร์ได้ตามปกติ');
});