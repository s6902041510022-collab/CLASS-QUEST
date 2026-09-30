// เปิด CLASS QUEST ให้คนอื่นเข้าใช้จากอินเทอร์เน็ตได้ทันที โดยไม่ต้องสมัครอะไร
//
// ทำไมต้องมี
// - ปกติ deploy บน Vercel แล้วต้องไปตั้งค่า KV ผ่านหน้าเว็บ Vercel ก่อน ซึ่งต้องใช้บัญชี
//   คนที่ deploy เท่านั้น ใครก็ทำแทนไม่ได้
// - สคริปต์นี้เป็นทางออกสำรอง: รันเซิร์ฟเวอร์บนเครื่องนี้ แล้วเจาะออกสู่อินเทอร์เน็ต
//   ด้วย Cloudflare Quick Tunnel (ไม่ต้องมีบัญชี ไม่ต้องใช้บัตร ได้ URL สาธารณะทันที)
//   เหมาะกับการสาธิตให้ครูคนอื่น / นักเรียนลองเล่น โดยไม่ต้องรอคนตั้งค่า
//
// ใช้:  npm run serve:public
//
// ⚠️ ข้อจำกัดที่ต้องรู้ (อ่านก่อนส่งลิงก์ให้คนอื่น)
//   - ใช้ได้ต่อเมื่อเครื่องนี้เปิดอยู่และไม่เข้าโหมดพัก (sleep)
//     ถ้าปิดเครื่องหรือหลับ ลิงก์จะใช้ไม่ได้ทันที
//   - URL เปลี่ยนทุกครั้งที่รันใหม่ (เป็นชื่อสุ่มของ Cloudflare) แต่จำไม่ได้ ต้องส่งลิงก์ใหม่ทุกครั้ง
//   - เปิดสู่อินเทอร์เน็ตสาธารณะ = ใครก็สมัครบัญชีครูของตัวเองได้
//     (แต่ข้อมูลถูกแยกตามเจ้าของ ครูคนอื่นมองเกมของเราไม่เห็น)
//
// ทางแก้ถาวรคือตั้ง KV บน Vercel (ดูหน้า /setup) — ครั้งเดียวแล้วใช้ได้นาน ๆ
// ไม่ต้องเปิดเครื่องค้างไว้
import { spawn } from 'node:child_process';
import { existsSync, createWriteStream, rmSync, renameSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const PORT = Number(process.env.PORT || 3000);
const CLOUDFLARED_URL =
  'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe';
const CLOUDFLARED_BIN = path.join(tmpdir(), 'classquest-cloudflared.exe');

/** ต้องเป็น URL ของ trycloudflare.com ที่ cloudflared พิมพ์ออกมา */
const URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;

/**
 * ดาวน์โหลด cloudflared เก็บไว้ใน temp (ครั้งเดียวพอ)
 *
 * เก็บใน temp ไม่ใช่ node_modules เพราะ node_modules ถูกลบทิ้งทุกครั้งที่ npm ci
 * ซึ่งจะทำให้ต้องดาวน์โหลดใหม่ทุกครั้ง
 */
async function ensureCloudflared() {
  if (existsSync(CLOUDFLARED_BIN)) {
    return CLOUDFLARED_BIN;
  }
  console.log('กำลังดาวน์โหลด cloudflared ครั้งแรก (~50 MB) ...');
  const res = await fetch(CLOUDFLARED_URL, { redirect: 'follow' });
  if (!res.ok || !res.body) {
    throw new Error(`ดาวน์โหลด cloudflared ไม่สำเร็จ (HTTP ${res.status})`);
  }
  const tmp = CLOUDFLARED_BIN + '.part';
  try {
    await pipeline(Readable.fromWeb(res.body), createWriteStream(tmp));
    renameSync(tmp, CLOUDFLARED_BIN);
  } catch (err) {
    rmSync(tmp, { force: true });
    throw err;
  }
  console.log(`ดาวน์โหลดเสร็จ: ${CLOUDFLARED_BIN}`);
  return CLOUDFLARED_BIN;
}

/** รอจนพอร์ตนั้นรับการเชื่อมต่อ */
async function waitForPort(port, timeoutMs = 60000) {
  const net = await import('node:net');
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const up = await new Promise((resolve) => {
      const sock = net.connect({ port, host: '127.0.0.1' });
      sock.once('connect', () => { sock.destroy(); resolve(true); });
      sock.once('error', () => resolve(false));
      sock.setTimeout(1000, () => { sock.destroy(); resolve(false); });
    });
    if (up) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

const children = [];
/** กำลังจะปิดอยู่ — ใช้แยก "ทันเกอร์หลุด" ออกจาก "ผู้ใช้กด Ctrl+C" */
let stopping = false;
function shutdown(code = 0) {
  stopping = true;
  for (const c of children) {
    try { c.kill(); } catch {}
  }
  process.exit(code);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

/**
 * กันเครื่องหลับระหว่างที่เปิดให้คนอื่นใช้
 *
 * ทำไมต้อง: วัดจากเครื่องจริงพบว่า Windows ตั้งให้เข้าโหมดพัก (standby) หลัง
 * 15 นาทีที่ไม่ขยับเมาส์ และจำเข้าโหมดหลับ (hibernate) หลัง 180 นาที
 * แปลว่าทันเกอร์จะตายก่อนเลิกคาบเสร็จ โดยที่หน้าเว็บยังดูปกติ
 *
 * ใช้ SetThreadExecutionState ไม่ใช่ powercfg /change
 * เพราะ Windows จะคืนค่ากลับให้เองทันทีที่ process ตาย
 * จึงไม่เหลือผลข้างเคียงกับการตั้งค่าระบบถาวร
 * และถ้าสคริปต์ล่ม/ถูกปิด การกันหลับก็หายไปเอง
 *
 * ES_CONTINUOUS (0x80000000) | ES_SYSTEM_REQUIRED (0x1) = ไม่ให้เครื่องหลับ
 * แต่ยังปล่อยให้จอดับตามปกติ (ไม่ใช้ ES_DISPLAY_REQUIRED)
 * ถ้าใช้แบบนี้ผู้ใช้จะได้ไม่ต้องคอยขยับเมาส์เพื่อค้างหน้าจอ
 */
function preventSleep() {
  if (process.platform !== 'win32') {
    console.log('ข้ามการกันหลับ: รองรับเฉพาะ Windows');
    return;
  }
  const ps = [
    'Add-Type -Namespace CQ -Name Sleep -MemberDefinition',
    "'[DllImport(\"kernel32.dll\")] public static extern uint SetThreadExecutionState(uint f);'",
    '[CQ.Sleep]::SetThreadExecutionState(0x80000001) | Out-Null',
    'try { while ($true) { Start-Sleep -Seconds 3600 } } finally { [CQ.Sleep]::SetThreadExecutionState(0x80000000) | Out-Null }',
  ].join('; ');

  const proc = spawn('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', ps], {
    stdio: 'ignore',
    windowsHide: true,
  });
  children.push(proc);
  proc.on('exit', (c) => {
    if (c) console.warn('ตัวกันเครื่องหลับหยุดทำงาน — เครื่องอาจเข้าโหมดพักได้');
  });
  console.log('กันเครื่องหลับระหว่างนี้แล้ว (ปล่อยให้จอดับตามปกติ)');
}

console.log('กำลังเปิด CLASS QUEST ให้เข้าจากอินเทอร์เน็ต\n');

preventSleep();

// 1) เซิร์ฟเวอร์แบบ production (เร็วกว่า dev และไม่เผยซอร์สโค้ด)
//
// เรียก node ตรง ๆ แทนการใช้ npx + shell:true
// เพราะ shell:true จะ concatenate argument โดยไม่ escape ซึ่งเป็นช่องโหว่
// (Node เตือนเรื่องนี้ด้วย DeprecationWarning) และเสี่ยงถ้า PORT มาจากภายนอก
const NEXT_BIN = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');
if (!existsSync(NEXT_BIN)) {
  console.error('ยังไม่ได้ติดตั้ง dependency — รัน `npm install` แล้วลองใหม่');
  process.exit(1);
}
const server = spawn(process.execPath, [NEXT_BIN, 'start', '-p', String(PORT)], {
  stdio: 'inherit',
});
children.push(server);
server.on('exit', (code) => {
  if (code) console.error(`\nเซิร์ฟเวอร์หยุดทำงาน (exit ${code})`);
  shutdown(code ?? 0);
});

if (!(await waitForPort(PORT))) {
  console.error(`เซิร์ฟเวอร์ไม่ตอบที่พอร์ต ${PORT}`);
  shutdown(1);
}
console.log(`เซิร์ฟเวอร์พร้อมที่ http://localhost:${PORT}`);

// 2) เจาะออกสู่อินเทอร์เน็ต พร้อมเฝ้าดูและเปิดใหม่ให้เอง
//
// ทำไมต้องเฝ้าดู ไม่ใช่แค่รอ 'exit' event
// 'exit' ครอบคลุมแค่กรณี process ตาย แต่ลิงก์สาธารณะเสียได้โดยที่
// process ยังรอนอยู่ (เช่น DNS ของโดเมนทันเกอร์หายไป แต่ cloudflared
// ไม่ได้รู้ เพราะมันเชื่อมต่อผ่าน IP ของ Cloudflare ไม่ได้ดู DNS)
// กรณีแบบนี้หน้าจอของครูยังดูปกติทุกอย่าง ระหว่างที่นักเรียนเข้าไม่ได้
// วิธีเดียวที่จะรู้คือถามลิงก์จริงว่ายังตอบอยู่ไหม ไม่ใช่ดูว่า process รอนไหม
//
// ตรวจแล้วว่ากู้ได้จริง: ฆ่า classquest-cloudflared ทิ้ง แล้วลิงก์ใหม่
// ถูกประกาศเองและตอบ HTTP 200 ภายในไม่กี่วินาที
//
// ยอมรอ 3 ครั้ง (ประมาณ 1 นาที) ก่อนเปิดใหม่ เพราะแตะผิดแล้วแย่กว่าเดิมมาก
// คือ URL เปลี่ยน คนที่บันทึกลิงก์เดิมไว้ใช้ไม่ได้ทันที
//
// URL ของ quick tunnel เปลี่ยนทุกครั้งที่เปิดใหม่ ลิงก์เก่าเลยใช้ไม่ได้
const bin = await ensureCloudflared();
const TUNNEL_LOG = path.join(tmpdir(), 'classquest-tunnel.log');

let tunnel = null;
let currentUrl = null;
let restarts = 0;
let failedChecks = 0;
let restarting = false;
const MAX_RESTARTS = 20;

// เขียนลงไฟล์แบบ sync ด้วย ไม่ใช่แค่ console.log
// เพราะ stdout ที่ถูก redirect ไปไฟล์จะถูก buffer จนกว่า process จะจบ
// ทำให้เหมือนไม่มีอะไรเกิดขึ้น ตอนที่กำลังจะวินิจฉัยปัญหาจริง ๆ
function note(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    appendFileSync(TUNNEL_LOG, line);
  } catch {}
  console.log(msg);
}

function printBanner(url, warn) {
  console.log('\n' + '='.repeat(64));
  console.log('  เปิดให้คนอื่นใช้ได้ที่:');
  console.log('');
  console.log('    ' + url);
  console.log('');
  if (warn) console.log('  ' + warn);
  console.log('  ครูเข้าสู่ระบบ/สมัครบัญชีที่ ' + url + '/teacher/login');
  console.log('  ตรวจสถานะระบบได้ที่ ' + url + '/setup');
  console.log('='.repeat(64));
  console.log('\n  หยุดด้วยการกด Ctrl+C');
  console.log('  เครื่องนี้ถูกกันไม่ให้เข้าโหมดพักระหว่างที่ใช้งาน');
  console.log('  แต่ถ้าปิดเครื่องหรือถอดสายไฟ ลิงก์จะใช้ไม่ได้ทันที');
  console.log('  และจำเปลี่ยน PIN ก่อนส่งลิงก์ให้คนอื่น\n');
}

function killTunnel() {
  if (!tunnel) return;
  const dead = tunnel;
  tunnel = null;
  try {
    dead.kill();
  } catch {}
}

function restartTunnel(reason) {
  if (stopping || restarting) return;
  restarting = true;
  restarts++;
  currentUrl = null;
  failedChecks = 0;

  if (restarts > MAX_RESTARTS) {
    note(`หยุดเปิดใหม่: หลุดเกิน ${MAX_RESTARTS} ครั้ง (${reason}) — น่าจะเป็นปัญหาอินเทอร์เน็ต`);
    shutdown(1);
    return;
  }

  note(`ทันเกอร์หลุด (${reason}) — กำลังเปิดใหม่ใน 3 วินาที (ครั้งที่ ${restarts}/${MAX_RESTARTS})`);
  killTunnel();
  setTimeout(() => {
    if (stopping) return;
    restarting = false;
    startTunnel();
  }, 3000);
}

function startTunnel() {
  tunnel = spawn(
    bin,
    ['tunnel', '--url', `http://localhost:${PORT}`, '--no-autoupdate', '--protocol', 'http2'],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );
  children.push(tunnel);

  let gotUrl = false;
  tunnel.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    try {
      appendFileSync(TUNNEL_LOG, text);
    } catch {}
    const m = text.match(URL_RE);
    if (m && !gotUrl) {
      gotUrl = true;
      currentUrl = m[0];
      note(`ได้ลิงก์: ${currentUrl}`);
      printBanner(
        currentUrl,
        restarts > 0
          ? `ทันเกอร์หลุดไปแล้ว ${restarts} ครั้ง — ลิงก์เก่าใช้ไม่ได้แล้ว ใช้ลิงก์นี้แทน`
          : null
      );
    }
  });

  tunnel.on('exit', (code) => {
    if (stopping) return;
    restartTunnel(`process หยุดทำงาน exit=${code}`);
  });
}

// เฝ้าดูว่าลิงก์ยังตอบอยู่จริงไหม — จุดที่ process-liveness ตรวจไม่เจอ
// ใช้ /api/health เพราะเป็น endpoint ที่เบาที่สุดและไม่แตะข้อมูล
async function linkAlive() {
  if (!currentUrl) return true; // ยังไม่ได้ URL อยู่ ไม่ต้องรีสตาร์ท
  try {
    const res = await fetch(currentUrl + '/api/health', {
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

note(`บันทึก log ทันเกอร์ไว้ที่ ${TUNNEL_LOG}`);
startTunnel();

setInterval(async () => {
  if (stopping || restarting) return;
  if (await linkAlive()) {
    if (failedChecks > 0) note('ลิงก์กลับมาตอบสนองแล้ว');
    failedChecks = 0;
    return;
  }
  failedChecks++;
  note(`เช็คลิงก์ไม่ผ่าน ${failedChecks}/3 ครั้ง`);
  if (failedChecks >= 3) restartTunnel('ลิงก์ไม่ตอบสนอง 3 ครั้งติดกัน');
}, 20000);
