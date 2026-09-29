// ตรวจโค้ดโดยไม่ไปแตะ .next ของ dev server ที่กำลังรันอยู่
//   npm run check
// ใช้ .next-check แยกจาก .next → build อีกครั้งโดย dev server ยังทำงานต่อได้
import { spawnSync } from 'child_process';
import { rmSync } from 'fs';
import path from 'path';

const DIST = '.next-check';
const bin = (cmd) => (process.platform === 'win32' ? `${cmd}.cmd` : cmd);

function run(cmd, args) {
  console.log(`\n> ${cmd} ${args.join(' ')}\n`);
  const r = spawnSync(bin(cmd), args, {
    stdio: 'inherit',
    env: { ...process.env, NEXT_DIST_DIR: DIST },
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) process.exit(r.status || 1);
}

run('npx', ['tsc', '--noEmit']);
run('npx', ['next', 'build']);

rmSync(path.join(process.cwd(), DIST), { recursive: true, force: true });
console.log('\n✅ ผ่านทั้งหมด (tsc + build) — .next ของ dev server ไม่ถูกแตะ');
