import { NextResponse } from 'next/server';
import {
  getDb,
  usingKv,
  usingFirestore,
  storeLabel,
  storeWritable,
  wrongRedisIntegration,
  explainWrongIntegration,
  readOnlyTokenOnly,
  explainReadOnlyToken,
} from '@/lib/db';
import { getFirebaseInfo } from '@/lib/firebase';

export const dynamic = 'force-dynamic';

/**
 * ขั้นตอนแก้เมื่อที่เก็บข้อมูลใช้ไม่ได้
 *
 * ทำเป็นข้อมูลโครงสร้าง (ไม่ใช่ข้อความยาว ๆ) เพราะหน้า /setup ต้องเอาไปแสดง
 * และต้องอัปเดตตามสถานะจริง
 *
 * ⚠️ ขั้นตอนชุดนี้เขียนตาม UI ของ Vercel ณ ก.ย. 2026
 *    Vercel KV ถูกยกเลิกไปแล้ว (ธ.ค. 2024) เปลี่ยนเป็น Marketplace
 *    และ "Storage" ที่เคยเห็นในหน้าโปรเจกต์ ยังไม่มีถ้ายังไม่ได้ติดตั้งอะไรเลย
 *    ต้องเริ่มจาก Integrations ที่ sidebar ของ dashboard
 */
function fixSteps(wrongIntegration: boolean, readOnlyToken = false): { title: string; steps: string[] } {
  if (readOnlyToken) {
    return {
      title: 'ใส่โทเคนผิดใบ — ใบที่ใช้อ่านได้อย่างเดียว',
      steps: [
        'Vercel > Settings > Environment Variables (แท็บ Production)',
        'หาแถวที่ชื่อลงท้ายด้วย _READ_ONLY_TOKEN — นี่คือใบที่เขียนไม่ได้',
        'ลบแถวนั้นออก แล้วใช้แถวที่ชื่อ KV_REST_API_TOKEN (หรือ UPSTASH_REDIS_REST_TOKEN) แทน',
        'ตรวจว่าชื่อไม่มีคำว่า READ_ONLY ต่อท้าย',
        'กลับไป Deployments > Redeploy',
      ],
    };
  }
  if (wrongIntegration) {
    return {
      title: 'ติดตั้ง integration ผิดตัว — Redis ใช้ไม่ได้ ต้องใช้ Upstash',
      steps: [
        'Vercel > Integrations (sidebar ซ้าย) > Browse Marketplace',
        'ค้นหา "Upstash" แล้วกด Install  (อย่าเลือกชื่อ "Redis" — เป็นคนละโปรโตคอล)',
        'เลือกแผนราคา (Free) > Continue > ตั้งชื่อฐานข้อมูล > Create',
        'ไปที่ Products > ชื่อฐานข้อมูลของคุณ > แท็บ Projects > Connect Project > เลือก class-quest',
        'ติ๊ก Environment: Production + Preview แล้วกด Connect',
        'กลับไป Deployments > Redeploy (เปลี่ยนค่า env แล้ว deployment ที่รันอยู่จะไม่เปลี่ยน)',
      ],
    };
  }
  return {
    title: 'ตั้งฐานข้อมูลบนเว็บ (ทำครั้งเดียว)',
    steps: [
      'Vercel > Integrations (sidebar ซ้าย) > Browse Marketplace',
      'ค้นหา "Upstash" แล้วกด Install  (ชื่อ "Redis" ใช้ไม่ได้ เพราะเป็นคนละโปรโตคอล)',
      'เลือกแผนราคา (Free) > Continue > ตั้งชื่อฐานข้อมูล > Create',
      'ไปที่ Products > ชื่อฐานข้อมูลของคุณ > แท็บ Projects > Connect Project > เลือก class-quest',
      'ติ๊ก Environment: Production + Preview แล้วกด Connect',
      'กลับไป Deployments > Redeploy (สำคัญ — เปลี่ยนค่า env แล้ว deployment ที่รันอยู่จะไม่เปลี่ยน)',
    ],
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
      wrongRedisIntegration,
      readOnlyTokenOnly,
      // บอกด้วยว่า credential มาจากไหน — ถ้ามาจากไฟล์ในเครื่องโดยไม่ตั้งใจ
      // เกมที่ครูสร้างไว้จะดูเหมือนหายไปทั้งที่ยังอยู่
      firebaseSource: firebase.source,
      writable: perm.writable,
      // ถ้าเขียนไม่ได้ ให้บอกด้วยว่าต้องทำอะไรต่อ ไม่ใช่แค่รหัส error
      hint: broken
        ? wrongRedisIntegration
          ? explainWrongIntegration()
          : readOnlyTokenOnly
            ? explainReadOnlyToken()
            : `ที่เก็บข้อมูลเขียนไม่ได้ (${perm.reason}) — ถ้า deploy บน Vercel ` +
              `ต้องติดตั้ง integration "Upstash" ที่ Vercel > Integrations > Marketplace`
        : undefined,
      fix: broken ? fixSteps(wrongRedisIntegration, readOnlyTokenOnly) : undefined,
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
        wrongRedisIntegration,
        readOnlyTokenOnly,
        firebaseSource: firebase.source,
        writable: false,
        hint: `เชื่อมต่อที่เก็บข้อมูลไม่สำเร็จ: ${reason}`,
        fix: fixSteps(wrongRedisIntegration, readOnlyTokenOnly),
      },
      { status: 500 }
    );
  }
}
