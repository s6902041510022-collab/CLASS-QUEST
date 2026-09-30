// อัปโหลดข้อมูลและเกมตัวอย่างขึ้น Cloud Firestore (Firebase)
//
// วิธีใช้งาน:
// 1. วางไฟล์ serviceAccountKey.json ไว้ที่โฟลเดอร์หลักของโปรเจกต์
//    หรือตั้งค่า FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY ใน .env.local
// 2. รันคำสั่ง:
//    npm run seed:firestore
//    หรือ
//    npm run db:upload:firestore

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { applySeedGames } from './seed-games.mjs';
import { applySeedTasks } from './seed-tasks.mjs';

// ตรวจสอบและดึง Service Account
function getCredentials() {
  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(process.cwd(), 'serviceAccountKey.json');
  if (existsSync(filePath)) {
    try {
      const content = readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return {
          source: `ไฟล์ ${filePath}`,
          creds: {
            projectId: parsed.project_id,
            clientEmail: parsed.client_email,
            privateKey: parsed.private_key,
          },
        };
      }
    } catch (e) {
      console.warn('⚠️ ไม่สามารถอ่านไฟล์ serviceAccountKey.json ได้:', e.message);
    }
  }

  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (rawKey) {
    try {
      let jsonStr = rawKey.trim();
      if (!jsonStr.startsWith('{')) {
        jsonStr = Buffer.from(jsonStr, 'base64').toString('utf8');
      }
      const parsed = JSON.parse(jsonStr);
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return {
          source: 'ตัวแปร FIREBASE_SERVICE_ACCOUNT_KEY',
          creds: {
            projectId: parsed.project_id,
            clientEmail: parsed.client_email,
            privateKey: parsed.private_key,
          },
        };
      }
    } catch (e) {
      console.warn('⚠️ ไม่สามารถแปลง JSON จาก FIREBASE_SERVICE_ACCOUNT_KEY ได้:', e.message);
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
    return {
      source: 'ตัวแปร FIREBASE_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY',
      creds: { projectId, clientEmail, privateKey },
    };
  }

  return null;
}

const credResult = getCredentials();
if (!credResult) {
  console.error('❌ ไม่พบข้อมูลการเชื่อมต่อ Firebase Firestore!');
  console.error('');
  console.error('วิธีตั้งค่า (เลือกวิธีใดวิธีหนึ่ง):');
  console.error('1) นำไฟล์ Service Account JSON ที่ดาวน์โหลดจาก Firebase Console มาวางไว้ที่โฟลเดอร์โปรเจกต์');
  console.error('   โดยตั้งชื่อไฟล์ว่า serviceAccountKey.json');
  console.error('');
  console.error('2) หรือใส่ค่าในไฟล์ .env.local:');
  console.error('   FIREBASE_PROJECT_ID=your-project-id');
  console.error('   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project-id.iam.gserviceaccount.com');
  console.error('   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"');
  process.exit(1);
}

console.log(`🔑 ใช้การเชื่อมต่อจาก: ${credResult.source}`);
console.log(`🚀 กำลังเชื่อมต่อ Project: ${credResult.creds.projectId}...`);

let app;
const apps = getApps();
if (apps.length > 0 && apps[0]) {
  app = apps[0];
} else {
  app = initializeApp({
    credential: cert(credResult.creds),
  });
}

const firestore = getFirestore(app);

const COLLECTION = process.env.FIREBASE_FIRESTORE_COLLECTION || 'classquest';
const DOC_NAME = process.env.FIREBASE_FIRESTORE_DOC || 'db';

async function uploadToFirestore() {
  const dbJsonPath = path.join(process.cwd(), 'data', 'db.json');
  const dbDefaultPath = path.join(process.cwd(), 'data', 'db.default.json');

  let dbData;
  if (existsSync(dbJsonPath)) {
    console.log('📂 พบ data/db.json นำข้อมูลปัจจุบันขึ้น Cloud Firestore');
    dbData = JSON.parse(readFileSync(dbJsonPath, 'utf8'));
  } else {
    console.log('📂 ไม่พบ data/db.json เริ่มต้นจาก data/db.default.json');
    dbData = JSON.parse(readFileSync(dbDefaultPath, 'utf8'));
  }

  // ตรวจสอบคีย์จำเป็น
  for (const key of ['games', 'missions', 'students', 'players', 'teams', 'groups', 'sessions', 'teachers']) {
    if (!Array.isArray(dbData[key])) dbData[key] = [];
  }
  if (!dbData.settings) {
    dbData.settings = { teacherPin: '1234', teacherName: '' };
  }

  // เพิ่มเกมตัวอย่างถ้ายังไม่มี
  const a = applySeedGames(dbData);
  const b = applySeedTasks(dbData);

  const docRef = firestore.collection(COLLECTION).doc(DOC_NAME);
  await docRef.set(dbData);

  console.log(`✅ อัปโหลดขึ้น Cloud Firestore สำเร็จแล้ว!`);
  console.log(`   Collection: ${COLLECTION}, Document: ${DOC_NAME}`);
  console.log(`   จำนวนเกม: ${dbData.games.length} เกม`);
  console.log(`   จำนวนด่าน (missions): ${dbData.missions.length} ด่าน`);
  console.log(`   จำนวนนักเรียน: ${dbData.students.length} คน`);
  console.log(`   รหัส PIN ครู: ${dbData.settings.teacherPin || '1234'}`);
  if (a.addedGames || b.addedGame) {
    console.log(`   (เพิ่มเกมตัวอย่างใหม่: +${a.addedGames + b.addedGame} เกม)`);
  }
  console.log('');
  console.log('รายชื่อเกมบน Firestore:');
  for (const g of dbData.games) {
    console.log(`  - [${g.mode.padEnd(4)}] ${g.name} (Code: ${g.roomCode || '---'})`);
  }
}

uploadToFirestore()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ เกิดข้อผิดพลาดในการอัปโหลด:', err);
    process.exit(1);
  });
