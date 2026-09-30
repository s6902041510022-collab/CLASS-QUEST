// ตรวจโค้ดโดยไม่ไปแตะ .next ของ dev server ที่กำลังรันอยู่
//   npm run check
// ใช้ .next-check แยกจาก .next → build อีกครั้งโดย dev server ยังทำงานต่อได้
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';

const DIST = '.next-check';

// เรียก node ตรง ๆ ด้วยสคริปต์จริงใน node_modules แทนการผ่าน npx
// เหตุผล: npx บน Windows เป็นไฟล์ .cmd ซึ่งถ้าใช้ shell:true จะเกิด DEP0190
// เพราะ args ถูกต่อเป็นสตริงเดียวโดยไม่ escape (เสี่ยง command injection)
// การเรียก process.execPath ตรง ๆ ไม่ต้องใช้ shell เลย จึงไม่มีทั้ง warning และช่องโหว่
const TOOLS = [
  { label: 'tsc --noEmit', script: 'typescript/bin/tsc', args: ['--noEmit'] },
  { label: 'next build', script: 'next/dist/bin/next', args: ['build'] },
];

for (const tool of TOOLS) {
  const script = path.join('node_modules', ...tool.script.split('/'));
  console.log(`\n> node ${tool.label}\n`);

  const r = spawnSync(process.execPath, [script, ...tool.args], {
    stdio: 'inherit',
    env: { ...process.env, NEXT_DIST_DIR: DIST },
  });

  if (r.error) {
    console.error(`เรียก ${tool.label} ไม่สำเร็จ: ${r.error.message}`);
    process.exit(1);
  }
  if (r.status !== 0) process.exit(r.status || 1);
}

rmSync(path.join(process.cwd(), DIST), { recursive: true, force: true });
console.log('\n✅ ผ่านทั้งหมด (tsc + build) — .next ของ dev server ไม่ถูกแตะ');
