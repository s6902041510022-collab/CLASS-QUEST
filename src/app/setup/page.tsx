'use client';

/**
 * หน้าบอกสถานะระบบ — เปิดเพื่อรู้ทันทีว่าเว็บใช้งานได้ไหม
 *
 * ทำไมต้องมีหน้านี้
 * - เคยเจอกรณีจริง: deploy บน Vercel แล้วหน้าเว็บเปิดได้ปกติ หน้าตาโอเค
 *   แต่พอกดล็อกอินแล้ว 500 เพราะเขียนไฟล์ไม่ได้ (EROFS) ครูเลยไม่รู้ว่าจะแก้ยังไง
 * - ข้อความ error บอกได้แค่ว่า "ตั้ง env" แต่ไม่บอกว่าตั้งยังไง ต้องไปเดาเอง
 * - หน้านี้บอกสถานะจริง (ยิง /api/health สด ๆ) พร้อมขั้นตอนแก้แบบคลิกต่อคลิก
 *   และปุ่ม "ตรวจอีกครั้ง" เพื่อเช็คหลัง Redeploy เสร็จ
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type Health = {
  ok: boolean;
  store?: string;
  usingKv?: boolean;
  usingFirestore?: boolean;
  firebaseSource?: string | null;
  writable?: boolean;
  hint?: string;
  fix?: { title: string; steps: string[] };
  counts?: Record<string, number>;
};

export default function SetupPage() {
  const [data, setData] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      setData(await res.json());
    } catch (err: any) {
      setData({ ok: false, hint: `ติดต่อเซิร์ฟเวอร์ไม่ได้: ${err?.message || err}` });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  const good = Boolean(data?.ok);
  // เคยเจอ: วางไฟล์ serviceAccountKey.json ทิ้งไว้ ระบบเลยไปใช้ Firestore
  // เกมที่ครูสร้างไว้ก็ "หาย" ทั้งที่ยังอยู่ — ต้องเตือนไว้ตรง ๆ
  const strayFirestore = Boolean(data?.firebaseSource === 'ไฟล์ในเครื่อง');

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-5">
        <header>
          <h1 className="text-2xl font-bold text-slate-800">สถานะระบบ CLASS QUEST</h1>
          <p className="text-sm text-slate-500 mt-1">
            หน้านี้บอกว่าเว็บเก็บข้อมูลไว้ที่ไหน และใช้งานได้หรือยัง
          </p>
        </header>

        {/* สถานะรวม */}
        <div
          className={`rounded-xl border p-5 ${
            loading
              ? 'border-slate-200 bg-white'
              : good
              ? 'border-emerald-300 bg-emerald-50'
              : 'border-red-300 bg-red-50'
          }`}
        >
          {loading ? (
            <p className="text-slate-500">กำลังตรวจสอบ...</p>
          ) : good ? (
            <>
              <p className="text-lg font-semibold text-emerald-700">ใช้งานได้ปกติ</p>
              <p className="text-sm text-emerald-800 mt-1">
                เก็บข้อมูลที่ <code className="bg-white px-1.5 py-0.5 rounded">{data?.store}</code>
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-red-700">ยังใช้งานไม่ได้</p>
              {data?.hint && <p className="text-sm text-red-800 mt-2 leading-relaxed">{data.hint}</p>}
            </>
          )}
        </div>

        {/* เตือนเรื่องไฟล์ credential ที่ทำให้ข้อมูลดูหาย */}
        {strayFirestore && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
            <p className="font-semibold text-amber-800">เจอไฟล์ credential ของ Firebase ในเครื่องนี้</p>
            <p className="text-sm text-amber-900 mt-2 leading-relaxed">
              ระบบกำลังใช้ Firestore แทนที่จะใช้ Redis/ไฟล์ ถ้าไม่ได้ตั้งใจ เกมหรือนักเรียนที่ครูสร้างไว้
              จะดูเหมือนหายไป (ข้อมูลยังอยู่ แต่ถูกเก็บไว้คนละที่)
              <br />
              แก้โดยย้ายไฟล์ <code>serviceAccountKey.json</code> ออกจากโฟลเดอร์โปรเจกต์
              แล้ว restart เซิร์ฟเวอร์
            </p>
          </div>
        )}

        {/* ขั้นตอนแก้ */}
        {data?.fix && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-800">{data.fix.title}</h2>
            <ol className="mt-3 space-y-2 list-decimal list-inside text-sm text-slate-700">
              {data.fix.steps.map((step, i) => (
                <li key={i} className="leading-relaxed">
                  {step}
                </li>
              ))}
            </ol>
            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-medium">หลังตั้งเสร็จ อย่าลืมเติมข้อมูลตัวอย่าง (ทำครั้งเดียว)</p>
              <code className="mt-1 block text-xs bg-white p-2 rounded border border-slate-200">
                npm run seed:kv
              </code>
            </div>
          </div>
        )}

        {/* รายละเอียด */}
        {data?.counts && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-800">ข้อมูลในระบบตอนนี้</h2>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {Object.entries(data.counts).map(([key, value]) => (
                <div key={key} className="rounded-lg bg-slate-50 p-3">
                  <div className="text-slate-500 text-xs">{key}</div>
                  <div className="text-lg font-semibold text-slate-800">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={check}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'กำลังตรวจ...' : 'ตรวจอีกครั้ง'}
          </button>
          <Link
            href="/teacher/login"
            className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium"
          >
            ไปหน้าครู
          </Link>
        </div>
      </div>
    </main>
  );
}