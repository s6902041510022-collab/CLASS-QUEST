'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * คู่มือการใช้งาน — เปิดจากปุ่มบนหน้าแรก
 *
 * ทำเป็น modal ไม่ใช่หน้าแยก เพื่อไม่ให้คนที่กำลังจะเล่นเสียบริบท
 * (หน้าแรกคือทางเข้าทั้งครูและนักเรียน ถ้าพาไปหน้าอื่นต้องกดกลับมาเอง)
 *
 * แชร์ลิงก์ได้: เปิด modal แล้ว URL จะมี ?help=1 ติดไป
 * ครูคัดลอกลิงก์นั้นส่งให้นักเรียนหรือผู้ปกครองได้เลย
 */

type Tab = 'student' | 'teacher' | 'faq';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'student', label: 'นักเรียน', icon: '🎮' },
  { id: 'teacher', label: 'ครู', icon: '👨‍🏫' },
  { id: 'faq', label: 'ปัญหาที่พบบ่อย', icon: '❓' },
];

/** หัวข้อย่อยในเนื้อหา */
function H({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h3 className="flex items-start gap-3 font-bold text-quest-text mt-6 mb-1 first:mt-0">
      <span className="shrink-0 w-6 h-6 rounded-full bg-quest-sky text-white text-sm flex items-center justify-center mt-0.5">
        {n}
      </span>
      <span>{children}</span>
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-quest-text/70 text-sm leading-relaxed mb-2 ml-9">{children}</p>;
}

/** กล่องเตือน */
function Note({ icon = '💡', children }: { icon?: string; children: React.ReactNode }) {
  return (
    <div className="ml-9 mb-2 flex gap-2 items-start bg-lavender-50 border border-lavender-100 rounded-2xl px-3 py-2">
      <span className="shrink-0">{icon}</span>
      <p className="text-quest-text/70 text-sm leading-relaxed">{children}</p>
    </div>
  );
}

/** ปัญหา + วิธีแก้ */
function Fix({ q, a }: { q: string; a: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <p className="font-medium text-quest-text text-sm mb-1">❓ {q}</p>
      <div className="text-quest-text/70 text-sm leading-relaxed ml-5">{a}</div>
    </div>
  );
}

export default function HelpGuide() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('student');
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // เปิดอัตโนมัติถ้าลิงก์มี ?help=1 (ครูแชร์ลิงก์คู่มือให้คนอื่น)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('help') === '1') setOpen(true);
  }, []);

  // เลื่อนหน้าหลังไม่ได้ตอนเปิด modal + ย้ายโฟกัสเข้าปุ่มปิด
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const show = (next: boolean) => {
    setOpen(next);
    // เก็บ ?help=1 ใน URL ไว้ตอนเปิด เอาออกตอนปิด
    // ใช้ replaceState ไม่ใช้ push เพื่อไม่ให้ปุ่มย้อนกลับของเบราว์เซอร์พาคนไปเปิด modal ซ้ำ
    const url = new URL(window.location.href);
    if (next) url.searchParams.set('help', '1');
    else url.searchParams.delete('help');
    window.history.replaceState({}, '', url);
  };

  // ⚠️ ปิดทุกทางต้องผ่าน show(false) เสมอ ไม่ใช่ setOpen(false) ตรง ๆ
  //    เพราะ show() คือตัวเดียวที่ลบ ?help=1 ออกจาก URL
  //    ถ้าทางไหนเรียก setOpen(false) โดยตรง ลิงก์คู่มือจะค้างอยู่ใน URL
  //    แล้วรีเฟรชแล้ว modal จะเปิดขึ้นมาอีก (เจอตอนทดสอบบนเว็บจริง)
  //    → ทุกจุดที่ปิด modal ต้องใช้ show(false)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') show(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => show(true)}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/80 backdrop-blur border-2 border-quest-sky/40 text-quest-text font-medium hover:bg-white hover:border-quest-sky transition-all active:scale-95"
      >
        📖 คู่มือใช้งาน
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) show(false);
          }}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="คู่มือการใช้งาน"
            className="card w-full sm:max-w-2xl max-h-[88vh] sm:max-h-[85vh] flex flex-col rounded-b-none sm:rounded-3xl overflow-hidden"
          >
            {/* หัวเรื่อง */}
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-sky-50 to-lavender-50">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📖</span>
                <div>
                  <h2 className="font-bold text-quest-text leading-tight">คู่มือใช้งาน</h2>
                  <p className="text-xs text-quest-text/60">CLASS QUEST · เริ่มเล่นได้ใน 1 นาที</p>
                </div>
              </div>
              <button
                ref={closeRef}
                onClick={() => show(false)}
                aria-label="ปิดคู่มือ"
                className="shrink-0 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-quest-text/60 hover:text-quest-text text-xl transition-colors"
              >
                ✕
              </button>
            </div>

            {/* แท็บ */}
            <div className="flex gap-2 px-5 sm:px-6 pt-4 shrink-0">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  aria-pressed={tab === t.id}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    tab === t.id
                      ? 'bg-quest-sky text-white shadow-soft'
                      : 'bg-gray-100 text-quest-text/60 hover:bg-gray-200'
                  }`}
                >
                  <span className="mr-1">{t.icon}</span>
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
            </div>

            {/* เนื้อหา */}
            <div className="overflow-y-auto px-5 sm:px-6 py-5">
              {tab === 'student' && (
                <div>
                  <H n={1}>ขอ Room Code จากครู</H>
                  <P>
                    รหัสห้องมี 6 ตัว เช่น <code className="font-mono">QUEST1</code> — ครู
                    กดปุ่ม 🔑 บนหน้าเกมเพื่อคัดลอกได้ทันที
                  </P>

                  <H n={2}>เปิดเว็บแล้วกรอก Room Code</H>
                  <P>
                    เปิดลิงก์เว็บ → กด <b>🎮 สำหรับนักเรียน</b> → พิมพ์รหัสห้อง
                    ต้องครบ 6 ตัว (เครื่องคอมพิวเตอร์โรงเรียนก็ใช้ได้)
                  </P>

                  <H n={3}>เลือกชื่อของตัวเอง</H>
                  <P>
                    เลือกชื่อที่ครูใส่ไว้ให้ในรายชื่อ — ถ้าไม่เจอชื่อของตัวเอง
                    ให้กด <b>ไม่เจอชื่อของคุณ? เพิ่มชื่อใหม่</b> แล้วพิมพ์ชื่อเองได้เลย
                  </P>
                  <Note icon="👥">
                    รายชื่อที่เห็นคือนักเรียนของห้องนั้นเท่านั้น ไม่เห็นของห้องอื่น
                  </Note>

                  <H n={4}>รอครูเริ่มเกม</H>
                  <P>
                    หน้าจอจะขึ้นว่า <b>รอครูเริ่มเกม...</b> — เปิดค้างไว้ อย่าเพิ่งปิด
                    เมื่อครูกดเริ่มเกม หน้าจะเปลี่ยนเองอัตโนมัติ
                  </P>

                  <H n={5}>ตอบคำถาม</H>
                  <P>
                    <b>ตอบถูก</b> → เลื่อนไปข้อถัดไปทันที ไม่ต้องรอครูกด
                    <br />
                    <b>ตอบผิด</b> → เห็นเฉลยกับคำอธิบาย แล้วกดไปข้อถัดไปเอง
                  </P>
                  <Note icon="⭐">
                    แถบคะแนนมุมบนคือคะแนนของตัวเอง — <b>ตอบเร็วได้โบนัสเพิ่ม</b>
                    ด่านบอส 👹 ต้องรอครูกด «เปิดด่านบอส» ก่อนจะได้เล่น
                  </Note>

                  <H n={6}>ดูผลของตัวเอง</H>
                  <P>
                    กด 🏠 มุมซ้ายบน → เลือก <b>ผลการเล่นของฉัน</b> ดูคะแนนและเฉลยย้อนหลังได้
                  </P>
                  <Note icon="⚠️">
                    เล่นบนเครื่องเดิมทุกครั้ง เพราะเว็บจำชื่อของเราไว้ในเครื่องนั้น
                    ถ้าเปลี่ยนเครื่องต้องกรอก Room Code แล้วเลือกชื่อใหม่
                  </Note>
                </div>
              )}

              {tab === 'teacher' && (
                <div>
                  <H n={1}>สมัครบัญชี (ครั้งเดียว)</H>
                  <P>
                    กด <b>👨‍🏫 สำหรับครู</b> → สมัครด้วยชื่อผู้ใช้ + รหัสผ่าน
                    ตั้งรหัสยาก ๆ หน่อย เพราะยังไม่มีระบบกู้รหัสผ่าน
                    เกมของคุณอยู่บนเซิร์ฟเวอร์ เข้าจากเครื่องไหนก็ได้
                  </P>

                  <H n={2}>สร้างเกม</H>
                  <P>
                    กด <b>สร้างเกมใหม่</b> กรอก 4 ขั้น: ข้อมูลเกม → โหมดการเล่น →
                    ตั้งค่า → ตรวจสอบ — ถ้าอยากมีด่านบอสให้ใส่ค่า <b>Boss HP</b> ไว้
                  </P>

                  <H n={3}>เพิ่มภารกิจ (คำถาม)</H>
                  <P>
                    หลังสร้างเกม ระบบจะพาไปหน้าภารกิจให้เอง — เพิ่มคำถามทีละข้อ
                    มี 3 ชนิด:
                  </P>
                  <div className="ml-9 mb-2 space-y-1.5 text-sm text-quest-text/70">
                    <p>
                      🔘 <b>ตัวเลือก</b> — กดวงกลมข้างคำตอบที่ถูกเพื่อทำเครื่องหมาย
                    </p>
                    <p>🔢 <b>กรอกตัวเลข</b> — ให้เด็กพิมพ์คำตอบเอง</p>
                    <p>🔗 <b>จับคู่</b> — จับคู่ฝั่งซ้ายกับขวา (อย่างน้อย 2 คู่ ห้ามซ้ำกัน)</p>
                  </div>
                  <Note icon="👹">
                    ทำเครื่องหมายข้อสุดท้ายเป็น <b>ด่านบอส</b> เพื่อให้มีช่วงปิดเกมพิเศษ
                  </Note>

                  <H n={4}>เพิ่มรายชื่อนักเรียน</H>
                  <P>
                    ไปหน้า <b>จัดการนักเรียน</b> — กรอกทีละคน หรือกด{' '}
                    <b>📋 เพิ่มรายชื่อทีละชุด</b> แล้ววางรายชื่อทั้งห้อง
                    (บรรทัดละชื่อ หรือคั่นด้วยจุลภาค) ครั้งเดียวจบทั้งห้อง
                  </P>

                  <H n={5}>เริ่มเกม แล้วส่ง Room Code</H>
                  <P>
                    เปิดหน้าเกม จะได้ <b>Room Code 6 หลัก</b> — กดปุ่ม 🔑 เพื่อคัดลอก
                    แล้วส่งให้นักเรียน (ทางไลน์ แชต หรือขึ้นจอเรียนก็ได้)
                  </P>

                  <H n={6}>ควบคุมระหว่างเล่น</H>
                  <P>
                    ดูว่าใครเข้าห้องแล้วและตอบถึงไหนได้จาก<b>รายชื่อด้านขวา</b> —
                    นักเรียนแต่ละคนเล่นทีละคน ไม่ต้องกดไปข้อถัดไปให้
                  </P>
                  <div className="ml-9 mb-2 flex flex-wrap gap-1.5">
                    {[
                      '⏸️ หยุด',
                      '▶️ เล่นต่อ',
                      '🏁 จบเกม',
                      '📊 ดูผล',
                      '⚔️ เปิดด่านบอส',
                      '⏱️ ตั้งเวลา',
                    ].map((c) => (
                      <span
                        key={c}
                        className="px-2 py-1 rounded-lg bg-gray-100 text-xs text-quest-text/70 font-medium"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                  <Note icon="⏱️">
                    ตั้งเวลาไว้ = จำกัดเวลาต่อข้อ (และได้โบนัสความเร็ว)
                    ไม่ตั้ง = ไม่จำกัดเวลา
                  </Note>

                  <H n={7}>ดูผล และเล่นซ้ำ</H>
                  <P>
                    กด <b>📊 ดูผล</b> เพื่อดูรายเกม / รายคน / รายข้อ —
                    ถ้าจะเล่นซ้ำในห้องเดิม กด <b>🚀 เริ่มเกมใหม่</b>
                    นักเรียนใช้ Room Code เดิมได้เลย
                  </P>
                  <Note icon="👤">
                    เปลี่ยนชื่อที่แสดงหรือรหัสผ่านได้ที่หน้า <b>ตั้งค่า</b> —
                    เปลี่ยนรหัสผ่านแล้วจะออกจากระบบทุกเครื่องทันที
                  </Note>
                </div>
              )}

              {tab === 'faq' && (
                <div>
                  <Fix
                    q="นักเรียนขึ้นว่า «ไม่พบห้องนี้»"
                    a="Room Code ไม่ครบ 6 ตัว หรือครูส่งรหัสของเกมเก่ามา — ให้ครูกด 🔑 ที่หน้าเกมเพื่อคัดลอกรหัสใหม่"
                  />
                  <Fix
                    q="ไม่เจอชื่อของฉันในรายชื่อ"
                    a="กด «ไม่เจอชื่อของคุณ? เพิ่มชื่อใหม่» แล้วพิมพ์ชื่อเองได้เลย ไม่ต้องรอครูเพิ่ม"
                  />
                  <Fix
                    q="หน้าจอค้าง / หลุดออกจากเกม"
                    a="กด 🏠 มุมซ้ายบน แล้วกรอก Room Code ใหม่ (ใช้เครื่องเดิม) — คะแนนที่ตอบไปแล้วยังอยู่"
                  />
                  <Fix
                    q="ครูล็อกอินค้างไว้ แล้วนักเรียนเข้าไม่ได้"
                    a="ให้ครูกด «ออกจากระบบ» ก่อน แล้วค่อยให้นักเรียนเข้า — หรือให้นักเรียนใช้เบราว์เซอร์/เครื่องที่ไม่ได้ล็อกอินครูไว้"
                  />
                  <Fix
                    q="ลืมรหัสผ่าน"
                    a={
                      <>
                        ยังไม่มีระบบกู้รหัสผ่าน ต้องสมัครบัญชีใหม่
                        <b> แต่เกมที่สร้างไว้จะยังอยู่</b> —
                        เกมเป็นของบัญชีแรกที่สมัครเท่านั้น ถ้ายังไม่มีใครสมัคร
                        บัญชีใหม่จะได้รับเกมเดิมไป ถ้ามีครูคนอื่นสมัครไปแล้วเกมจะอยู่ของเขา
                      </>
                    }
                  />
                  <Fix
                    q="สร้างเกมใหม่ไม่ได้ / ปุ่มกดไม่ติด"
                    a="ต้องล็อกอินให้เสร็จก่อน และเกมต้องมีภารกิจอย่างน้อย 1 ข้อถึงจะกด «เริ่มเกม» ได้"
                  />
                  <Fix
                    q="นักเรียนเข้าไปแล้วค้างที่ «รอครูเริ่มเกม»"
                    a="แปลว่าเขาเข้าห้องสำเร็จแล้ว แค่รอครูกด «🚀 เริ่มเกม» — ถ้าห้องเดียวกันเข้าทีละคนได้"
                  />
                  <Fix
                    q="เกมของฉันหายไปไหม"
                    a="เกมเก็บอยู่บนเซิร์ฟเวอร์ ไม่ได้อยู่ในเครื่อง — เข้าด้วยบัญชีเดิมจากเครื่องไหนก็ได้"
                  />
                  <div className="mt-5 ml-0 flex gap-2 items-start bg-sky-50 border border-sky-100 rounded-2xl px-3 py-2.5">
                    <span className="shrink-0">📶</span>
                    <p className="text-quest-text/70 text-sm leading-relaxed">
                      ทุกอย่างต้องต่ออินเทอร์เน็ต และนักเรียนไม่ต้องมีบัญชี —
                      ใช้แค่ Room Code จากครูก็เล่นได้เลย
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ท้าย modal */}
            <div className="px-5 sm:px-6 py-3 border-t border-gray-100 bg-gray-50/60 shrink-0 flex items-center justify-between gap-3">
              <p className="text-xs text-quest-text/50 hidden sm:block">
                แชร์ลิงก์นี้ให้นักเรียนได้ · ต้องต่ออินเทอร์เน็ต
              </p>
              <button
                onClick={() => show(false)}
                className="btn-primary text-sm w-full sm:w-auto"
              >
                เข้าใจแล้ว 👍
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
