// ทดสอบว่าระบบรู้จักชื่อ env ของ Upstash ทุกแบบ และจับกรณีติดตั้งผิดได้
//
// ทำไมต้องมีไฟล์นี้
// - ชื่อ env ของ Upstash ไม่ใช่ชื่อเดียวตลอด ขึ้นกับว่าติดตั้งผ่านทางไหน
//   (Vercel Marketplace ใช้ KV_REST_API_* / ติดตั้งนอก Vercel ใช้ UPSTASH_REDIS_REST_*)
//   ถ้ารองรับแค่ชื่อเดียว ผู้ใช้ที่ติดตั้งถูกทางแต่มีชื่ออีกแบบ จะเจอปัญหาเดิมซ้ำ:
//   ระบบเงียบ ๆ ไม่เห็นฐานข้อมูล แล้วพังด้วย EROFS
// - Vercel Marketplace มี "Redis" คนละตัวกับ "Upstash" (โปรโตคอล TCP vs REST)
//   ถ้าเผลอติดตั้งผิดตัว ต้องบอกได้ ไม่ใช่ปล่อยให้ตกไปใช้ไฟล์เงียบ ๆ
//
// ⚠️ ต้องอยู่คนละไฟล์กับ test อื่น เพราะ db.ts อ่าน env ตอนโหลดโมดูล
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * โหลด db.ts ในโปรเซสแยก เพราะค่า env ถูกอ่านครั้งเดียวตอน import
 * คืนค่าแค่ field ที่ต้องการ ไม่ต้องเปิดทั้งโมดูล
 */
async function loadDb(env) {
  const script = `
    const db = await import(${JSON.stringify(pathToFileURL(path.join(ROOT, 'src', 'lib', 'db.ts')).href)});
    console.log(JSON.stringify({
      usingKv: db.usingKv,
      usingFirestore: db.usingFirestore,
      wrongRedisIntegration: db.wrongRedisIntegration,
      readOnlyTokenOnly: db.readOnlyTokenOnly,
      storeLabel: db.storeLabel,
    }));
  `;
  const { execFileSync } = await import('node:child_process');
  const out = execFileSync(
    process.execPath,
    ['--import', './scripts/register-ts.mjs', '--input-type=module', '--eval', script],
    {
      cwd: ROOT,
      encoding: 'utf8',
      // ล้างทุกตัวแปรที่เกี่ยวกับฐานข้อมูล แล้วใส่เฉพาะที่ทดสอบ
      env: {
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        TEMP: process.env.TEMP,
        ...env,
      },
    }
  );
  return JSON.parse(out.trim().split('\n').pop());
}

test('ชื่อแบบ Vercel Marketplace (KV_REST_API_*) ใช้ได้', async () => {
  const db = await loadDb({
    KV_REST_API_URL: 'https://example.upstash.io',
    KV_REST_API_TOKEN: 'tok',
  });
  assert.equal(db.usingKv, true);
  assert.match(db.storeLabel, /^Redis/);
});

test('ชื่อแบบ Upstash นอก Vercel (UPSTASH_REDIS_REST_*) ก็ใช้ได้', async () => {
  // เคสนี้คือเหตุผลที่ไฟล์นี้มีอยู่: ติดตั้งถูกเจ้าแต่ชื่อ env อีกแบบ
  // ถ้าไม่รองรับ ระบบจะตกไปใช้ไฟล์แล้วพังด้วย EROFS โดยผู้ใช้ไม่รู้ว่าเพราะอะไร
  const db = await loadDb({
    UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: 'tok',
  });
  assert.equal(db.usingKv, true, 'ต้องรู้จักชื่อแบบ UPSTASH_REDIS_REST_* ด้วย');
  assert.match(db.storeLabel, /^Redis/);
});

test('มีแค่ URL อย่างเดียว = ยังใช้ไม่ได้ (ต้องมีทั้ง URL และ token)', async () => {
  const db = await loadDb({ KV_REST_API_URL: 'https://example.upstash.io' });
  assert.equal(db.usingKv, false, 'URL อย่างเดียวคือค่าว่าง ต้องมี token ด้วย');
});

test('ติดตั้ง integration "Redis" ผิดตัว ต้องถูกจับได้', async () => {
  const db = await loadDb({ REDIS_URL: 'rediss://default:pass@aws.connect.upstash.io:6379' });
  assert.equal(db.usingKv, false, 'REDIS_URL เป็นคนละโปรโตคอล ใช้ไม่ได้');
  assert.equal(
    db.wrongRedisIntegration,
    true,
    'ต้องบอกได้ว่าติดตั้งผิดตัว ไม่ใช่ปล่อยให้ตกไปใช้ไฟล์เงียบ ๆ'
  );
});

test('ไม่มี env อะไรเลย = ใช้ไฟล์ และไม่คิดว่าติดตั้งผิด', async () => {
  const db = await loadDb({});
  assert.equal(db.usingKv, false);
  assert.equal(db.wrongRedisIntegration, false);
  assert.match(db.storeLabel, /^ไฟล์/);
});

test('ติดตั้งถูกตัว (มี Upstash) ต้องไม่ถูกบอกว่าผิด แม้ REDIS_URL จะค้างอยู่', async () => {
  const db = await loadDb({
    KV_REST_API_URL: 'https://example.upstash.io',
    KV_REST_API_TOKEN: 'tok',
    REDIS_URL: 'rediss://default:pass@aws.connect.upstash.io:6379',
  });
  assert.equal(db.usingKv, true);
  assert.equal(
    db.wrongRedisIntegration,
    false,
    'มีค่าที่ใช้ได้แล้ว ต้องใช้ค่านั้น ไม่ใช่บอกว่าผิด'
  );
});

// โทเคนอ่านอย่างเดียว: อ่านผ่าน แต่ SET/DEL โดนปฏิเสธ
// อาการคือ "อ่านได้ แต่เขียนไม่ได้" ซึ่งดูจากข้างนอกเหมือนฐานข้อมูลเพี้ยน
// ไม่เหมือนคนตั้งค่าผิด ถ้าไม่จับไว้ ผู้ใช้จะเสียเวลาไล่หาสาเหตุที่ไม่ใช่ต้นตอ
test('ตั้งแต่โทเคนอ่านอย่างเดียว = ต้องถูกจับได้ ไม่ใช่พังเงียบ ๆ', async () => {
  const db = await loadDb({
    KV_REST_API_URL: 'https://example.upstash.io',
    KV_REST_API_READ_ONLY_TOKEN: 'ro',
  });
  assert.equal(db.usingKv, false, 'ใบอ่านอย่างเดียวใช้แทนใบเขียนไม่ได้');
  assert.equal(
    db.readOnlyTokenOnly,
    true,
    'ต้องบอกได้ว่าใส่โทเคนผิดใบ ไม่ใช่ตกไปใช้ไฟล์เหมือนไม่มีอะไรเกิดขึ้น'
  );
  assert.equal(db.wrongRedisIntegration, false, 'ไม่ใช่กรณีติดตั้ง integration ผิดเจ้า');
});

test('ตั้งทั้งสองใบ (อ่านอย่างเดียว + เขียนได้) = ปกติ ไม่ต้องเตือน', async () => {
  // Upstash ใส่ทั้งสองใบมาให้เสมอ ต้องไม่เตือนมั่วเมื่อใบเขียนได้ใช้งานได้จริง
  const db = await loadDb({
    KV_REST_API_URL: 'https://example.upstash.io',
    KV_REST_API_TOKEN: 'rw',
    KV_REST_API_READ_ONLY_TOKEN: 'ro',
  });
  assert.equal(db.usingKv, true);
  assert.equal(db.readOnlyTokenOnly, false, 'มีใบเขียนได้แล้วต้องใช้ตัวนั้น ไม่ต้องเตือน');
});
