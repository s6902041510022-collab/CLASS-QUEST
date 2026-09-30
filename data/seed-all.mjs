// เตรียมข้อมูลตัวอย่างทั้งหมดในคำสั่งเดียว
// ใช้: npm run seed   (ทำงานซ้ำได้ ไม่สร้างข้อมูลซ้ำถ้ามี id เดิมแล้ว)
//
// ขั้นตอน:
//   1. ถ้ายังไม่มี data/db.json ให้คัดลอกจาก data/db.default.json (เกมตั้งต้น 1 เกม)
//   2. เติมเกมตัวอย่างจาก data/seed-games.mjs
//   3. เติมเกมตัวอย่างที่มีคำถาม 3 ชนิดจาก data/seed-tasks.mjs
import { existsSync, copyFileSync } from 'fs';
import { spawnSync } from 'child_process';
import path from 'path';

const root = process.cwd();
const dbPath = path.join(root, 'data', 'db.json');
const defaultPath = path.join(root, 'data', 'db.default.json');

if (!existsSync(dbPath)) {
  if (!existsSync(defaultPath)) {
    console.error(`ไม่พบ ${defaultPath} — รัน npm run dev หนึ่งครั้งเพื่อสร้างฐานข้อมูลก่อน`);
    process.exit(1);
  }
  copyFileSync(defaultPath, dbPath);
  console.log('สร้าง data/db.json จาก db.default.json แล้ว');
}

for (const script of ['seed-games.mjs', 'seed-tasks.mjs']) {
  const file = path.join(root, 'data', script);
  const res = spawnSync(process.execPath, [file], { stdio: 'inherit', cwd: root });
  if (res.status !== 0) {
    console.error(`รัน ${script} ไม่สำเร็จ`);
    process.exit(res.status || 1);
  }
}
