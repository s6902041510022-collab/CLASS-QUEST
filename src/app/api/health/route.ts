import { NextResponse } from 'next/server';
import { getDb, usingKv, usingFirestore, storeLabel, storeWritable } from '@/lib/db';
import { getFirebaseInfo } from '@/lib/firebase';

export const dynamic = 'force-dynamic';

/**
 * ขั้นตอนแก้เมื่อที่เก็บข้อมูลใช้ไม่ได้
 *
 * ทำเป็นข้อมูลโครงสร้าง (ไม่ใช่ข้อความยาว ๆ) เพราะหน้า /setup ต้องเอาไปแสดง
 * และต้องอัปเดตตามสถานะจริง เช่น ถ้าใช้ Firestore อยู่ขั้นตอนจะต่างจาก Redis
 */
function fixSteps(reason?: string): { title: string; steps: string[] } {
  const base = [
    'เข้า vercel.com → เลือกโปรเจกต์ class-quest',
    'แท็บ Storage → Create Database → เลือก KV (Upstash Redis)',
    'กด Connect to project (เลือก Environment: Production + Preview แล้วกด Connect)',
    'กด Redeploy (สำคัญ — เปลี่ยนค่า env แล้ว deployment ที่รันอยู่จะไม่เปลี่ยน)',
  ];
  return {
    title: 'ตั้งฐานข้อมูลบนเว็บ (ทำครั้งเดียว)',
    steps: base,
  };
}

/** ใช้ตรวจว่าเชื่อมต่อฐานข้อมูลได้ และตอนนี้เก็บข้อมูลไว้ที่ไหน */
export async function GET() {
  const firebase = getFirebaseInfo();
  try {
    const db = await getDb();
    const perm = await storeWritable();
    const broken = !perm.writable;

    return NextResponse.json({
      ok: !broken,
      store: storeLabel,
      usingKv,
      usingFirestore,
      // บอกด้วยว่า credential มาจากไหน — ถ้ามาจากไฟล์ในเครื่องโดยไม่ตั้งใจ
      // เกมที่ครูสร้างไว้จะดูเหมือนหายไปทั้งที่ยังอยู่
      firebaseSource: firebase.source,
      writable: perm.writable,
      // ถ้าเขียนไม่ได้ ให้บอกด้วยว่าต้องทำอะไรต่อ ไม่ใช่แค่รหัส error
      hint: broken
        ? `ที่เก็บข้อมูลเขียนไม่ได้ (${perm.reason}) — ถ้า deploy บน Vercel ต้องตั้ง ` +
          `KV_REST_API_URL และ KV_REST_API_TOKEN (Vercel KV / Upstash Redis)`
        : undefined,
      fix: broken ? fixSteps(perm.reason) : undefined,
      counts: {
        games: db.data.games.length,
        missions: db.data.missions.length,
        students: db.data.students.length,
        players: db.data.players.length,
        sessions: db.data.sessions.length,
      },
    });
  } catch (err: any) {
    const reason = String(err?.message || err);
    return NextResponse.json(
      {
        ok: false,
        store: storeLabel,
        usingKv,
        usingFirestore,
        firebaseSource: firebase.source,
        writable: false,
        hint: `เชื่อมต่อที่เก็บข้อมูลไม่สำเร็จ: ${reason}`,
        fix: fixSteps(reason),
      },
      { status: 500 }
    );
  }
}
