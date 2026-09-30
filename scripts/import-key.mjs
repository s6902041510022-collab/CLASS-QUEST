import { existsSync, readFileSync, copyFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const searchDirs = [
  path.join(process.env.USERPROFILE || 'C:\\Users\\Namex', 'Downloads'),
  path.join(process.env.USERPROFILE || 'C:\\Users\\Namex', 'Desktop'),
  path.join(process.env.USERPROFILE || 'C:\\Users\\Namex', 'Desktop', 'เทอม1', 'Learning Methods and Classroom Management', 'ใบเนื้อหา และไวด์บอร์ด'),
];

console.log('🔍 กำลังค้นหาไฟล์ Firebase Service Account Key (.json)...');

function findKeyFile() {
  for (const dir of searchDirs) {
    if (!existsSync(dir)) continue;
    try {
      const files = readdirSync(dir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const fullPath = path.join(dir, file);
        try {
          const stat = statSync(fullPath);
          // หาเฉพาะไฟล์ที่เพิ่งสร้าง/แก้ไขไม่เกิน 24 ชม.
          if (Date.now() - stat.mtimeMs > 24 * 60 * 60 * 1000) continue;
          const content = readFileSync(fullPath, 'utf8');
          if (content.includes('private_key') && content.includes('project_id')) {
            const parsed = JSON.parse(content);
            if (parsed.project_id && parsed.client_email) {
              return { path: fullPath, info: parsed };
            }
          }
        } catch {}
      }
    } catch {}
  }
  return null;
}

const found = findKeyFile();
if (found) {
  const targetPath = path.join(process.cwd(), 'serviceAccountKey.json');
  copyFileSync(found.path, targetPath);
  console.log(`✅ พบไฟล์: ${found.path}`);
  console.log(`📁 คัดลอกและตั้งชื่อเป็น serviceAccountKey.json เรียบร้อยแล้ว!`);
  console.log(`🚀 กำลังนำข้อมูลขึ้น Cloud Firestore...`);
  try {
    execSync('node data/seed-firestore.mjs', { stdio: 'inherit' });
    console.log('🎉 เสร็จสิ้นทั้งหมดแล้ว!');
  } catch (err) {
    console.error('❌ รัน seed-firestore ล้มเหลว:', err.message);
  }
} else {
  console.log('❌ ยังไม่พบไฟล์ Service Account Key ใน Downloads หรือ Desktop');
}
