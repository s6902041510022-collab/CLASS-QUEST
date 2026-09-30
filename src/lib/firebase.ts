import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ServiceAccount / App / Firestore เป็น "ชนิด" ไม่ใช่ค่าที่รันได้
// ต้องแยกมาเป็น import type ไม่งั้น Next.js จะตัดให้เองแต่ Node ตอนรันเทสต์
// (ซึ่งตัด TypeScript แบบไม่รู้จัก type-only import) จะพังด้วย
// "does not provide an export named 'App'"
import type { ServiceAccount, App } from 'firebase-admin/app';
import type { Firestore } from 'firebase-admin/firestore';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

let firestoreInstance: Firestore | null = null;
let initError: string | null = null;
let warnedLocalFile = false;

/** ได้ credential มาจากไหน — ใช้บอกครูด้วยว่าระบบเลือกที่เก็บข้อมูลเพราะอะไร */
type CredentialSource = 'ไฟล์ในเครื่อง' | 'FIREBASE_SERVICE_ACCOUNT_PATH' | 'FIREBASE_SERVICE_ACCOUNT_KEY' | 'ตัวแปรแยก' | null;

/**
 * ดึง Service Account จากหลายแหล่ง:
 * 1. FIREBASE_SERVICE_ACCOUNT_PATH (หรือไฟล์ serviceAccountKey.json ในโปรเจกต์)
 * 2. FIREBASE_SERVICE_ACCOUNT_KEY (ข้อความ JSON หรือ Base64 JSON)
 * 3. ตัวแปรแยก: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *
 * คืนที่มาด้วย เพราะที่มาต่างกันมีผลต่าง: ไฟล์ในเครื่องอาจตั้งใจวางทิ้งไว้
 * แต่ก็อาจเป็นแค่ไฟล์ที่ลืมว่ามีอยู่ ซึ่งทำให้ระบบเปลี่ยนที่เก็บข้อมูลเงียบ ๆ
 */
function getCredentials(): { creds: ServiceAccount | null; source: CredentialSource } {
  // 1. ตรวจสอบไฟล์ serviceAccountKey.json
  const filePath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.join(process.cwd(), 'serviceAccountKey.json');

  if (existsSync(filePath)) {
    try {
      const content = readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return {
          creds: {
            projectId: parsed.project_id,
            clientEmail: parsed.client_email,
            privateKey: parsed.private_key,
          },
          source: process.env.FIREBASE_SERVICE_ACCOUNT_PATH
            ? 'FIREBASE_SERVICE_ACCOUNT_PATH'
            : 'ไฟล์ในเครื่อง',
        };
      }
    } catch (e: any) {
      console.warn('[Firebase] อ่านไฟล์ serviceAccountKey.json ไม่สำเร็จ:', e.message);
    }
  }

  // 2. ตรวจสอบ FIREBASE_SERVICE_ACCOUNT_KEY (JSON หรือ base64)
  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (rawKey) {
    try {
      let jsonStr = rawKey.trim();
      if (!jsonStr.startsWith('{')) {
        // อาจเป็น base64
        jsonStr = Buffer.from(jsonStr, 'base64').toString('utf8');
      }
      const parsed = JSON.parse(jsonStr);
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return {
          creds: {
            projectId: parsed.project_id,
            clientEmail: parsed.client_email,
            privateKey: parsed.private_key,
          },
          source: 'FIREBASE_SERVICE_ACCOUNT_KEY',
        };
      }
    } catch (e: any) {
      console.warn('[Firebase] แยก JSON จาก FIREBASE_SERVICE_ACCOUNT_KEY ไม่สำเร็จ:', e.message);
    }
  }

  // 3. ตรวจสอบตัวแปรแยก
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    // ปรับ \n ที่อาจหลุดมาจากการเก็บใน env
    privateKey = privateKey.replace(/\\n/g, '\n');
    return {
      creds: {
        projectId,
        clientEmail,
        privateKey,
      },
      source: 'ตัวแปรแยก',
    };
  }

  return { creds: null, source: null };
}

/**
 * เตือนเมื่อ credential มาจากไฟล์ในเครื่องโดยไม่ได้ตั้ง env ใด ๆ
 *
 * ⚠️ นี่คือกับดักที่ทำให้สับสน: serviceAccountKey.json อยู่ใน .gitignore
 *   แค่วางไฟล์นั้นลงโฟลเดอร์โปรเจกต์ (เช่นดาวน์โหลดมาจาก Firebase console แล้วลืมลบ)
 *   ระบบก็จะเงียบ ๆ เลิกอ่าน data/db.json แล้วไปใช้ Firestore แทน
 *   เกม/นักเรียนที่ครูสร้างไว้ก็หายจากหน้าจอ — ทั้งที่ข้อมูลไม่ได้หาย
 *   แค่ถูกอ่านจากคนละที่ ถ้าไม่บอกไว้ก่อน จะเข้าใจว่าข้อมูลหายจริง
 */
function warnIfUsingLocalFile(source: CredentialSource) {
  if (warnedLocalFile || source !== 'ไฟล์ในเครื่อง') return;
  warnedLocalFile = true;
  console.warn(
    '[Firebase] พบไฟล์ serviceAccountKey.json ในโฟลเดอร์โปรเจกต์ (ไม่ได้ตั้งผ่าน env) ' +
      'ระบบจะใช้ Firestore แทนไฟล์ data/db.json — ' +
      'ถ้าไม่ตั้งใจใช้ ให้ย้ายไฟล์นั้นออกจากโฟลเดอร์นี้ แล้ว restart เซิร์ฟเวอร์'
  );
}

export function isFirebaseConfigured(): boolean {
  const { creds, source } = getCredentials();
  if (creds) warnIfUsingLocalFile(source);
  return Boolean(creds);
}

export function getFirestoreDb(): Firestore | null {
  if (firestoreInstance) return firestoreInstance;
  if (initError) return null;

  const { creds, source } = getCredentials();
  if (!creds) return null;
  warnIfUsingLocalFile(source);

  try {
    const apps = getApps();
    let app: App;
    if (apps.length > 0 && apps[0]) {
      app = apps[0];
    } else {
      app = initializeApp({
        credential: cert(creds),
      });
    }

    firestoreInstance = getFirestore(app);
    return firestoreInstance;
  } catch (err: any) {
    initError = err?.message || String(err);
    console.error('[Firebase] เชื่อมต่อ Firestore ไม่สำเร็จ:', initError);
    return null;
  }
}

export function getFirebaseInfo() {
  const { creds, source } = getCredentials();
  return {
    configured: Boolean(creds),
    projectId: creds?.projectId,
    /** บอกว่า credential มาจากไหน — สำคัญเวลาที่เกมที่ครูสร้างไว้ "หายไป" */
    source,
    error: initError,
  };
}
