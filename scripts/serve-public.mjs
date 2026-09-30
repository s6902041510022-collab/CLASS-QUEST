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
//   - เปิดสู่อินเทอร์เน็ตสาธารณะ = ใครก็กดเข้าได้ ต้องเปลี่ยน PIN ครูก่อนส่งลิงก์
//     (ค่าเริ่มต้น 1234 อยู่ที่หน้า /teacher/settings)
//
// ทางแก้ถาวรคือตั้ง KV บน Vercel (ดูหน้า /setup) — ครั้งเดียวแล้วใช้ได้นาน ๆ
// ไม่ต้องเปิดเครื่องค้างไว้
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, createWriteStream, rmSync, statSync } from 'node:fs';
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
    const { renameSync } = await import('node:fs');
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
function shutdown(code = 0) {
  for (const c of children) {
    try { c.kill(); } catch {}
  }
  process.exit(code);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('กำลังเปิด CLASS QUEST ให้เข้าจากอินเทอร์เน็ต\n');

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

// 2) เจาะออกสู่อินเทอร์เน็ต
const bin = await ensureCloudflared();
const tunnel = spawn(bin, [
  'tunnel',
  '--url', `http://localhost:${PORT}`,
  '--no-autoupdate',
  '--protocol', 'http2',
], { stdio: ['ignore', 'ignore', 'pipe'] });
children.push(tunnel);

let found = false;
tunnel.stderr.on('data', (chunk) => {
  const text = chunk.toString();
  const m = text.match(URL_RE);
  if (m && !found) {
    found = true;
    const url = m[0];
    // URL ต้องเป็น ASCII ล้วน เพื่อให้อ่านออกแม้ console จะแสดงภาษาไทยเพี้ยน
    console.log('\n' + '='.repeat(64));
    console.log('  เปิดให้คนอื่นใช้ได้ที่:');
    console.log('');
    console.log('    ' + url);
    console.log('');
    console.log('  PIN ครู (ค่าเริ่มต้น): 1234');
    console.log('  เปลี่ยน PIN ได้ที่ ' + url + '/teacher/settings');
    console.log('  ตรวจสถานะระบบได้ที่ ' + url + '/setup');
    console.log('='.repeat(64));
    console.log('\n  หยุดด้วยการกด Ctrl+C');
    console.log('  ข้อควรระวัง: ลิงก์นี้ใช้ได้ตราบใดที่เครื่องนี้เปิดอยู่');
    console.log('  และจำเปลี่ยน PIN ก่อนส่งลิงก์ให้คนอื่น\n');
  }
  // แสดง error จาก tunnel เฉพาะเมื่อยังไม่ได้ URL
  if (!found && /ERR|error/i.test(text)) process.stderr.write(text);
});

tunnel.on('exit', (code) => {
  if (!found) console.error('tunnel หยุดทำงานก่อนได้ URL');
  shutdown(code ?? 0);
});
