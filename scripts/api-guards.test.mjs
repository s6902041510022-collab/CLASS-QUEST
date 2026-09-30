// ประตูตรวจ: ทุก /api/* ต้องประกาศว่า "เปิดให้ใคร" ไว้ให้เห็น
//
// ทำไมต้องมีไฟล์นี้
// ก่อนมีระบบบัญชีครู ทุก route เปิดให้ใครก็เรียกได้ ไม่มีด่านตรวจอะไรเลย
// ผลคือครูคนแรกที่เข้ามาเจอทุกอย่าง: สร้าง/ลบเกม, แก้คะแนนนักเรียน,
// กดหยุดเวลา, จบเกมของครูคนอื่น — ทั้งหมดนี้เคยเป็นเรื่อง "ทำได้" ไม่ใช่ข้อผิดพลาด
//
// ตอนนี้แก้แล้ว แต่โค้ด route จะมีอีกสักร้อยบรรทัดและจะมีคนเพิ่ม route ใหม่
// ความเสี่ยงจริงๆ คือ "เพิ่มแล้วลืมใส่ด่าน" เพราะมันไม่พัง ไม่เตือน และทดสอบก็ผ่าน
//
// วิธีกัน: บังคับให้ประกาศไว้ในตารางด้านล่างทุก route ทุก method
//   - เพิ่ม route ใหม่โดยไม่ประกาศ → เทสต์นี้แดง พร้อมบอกว่าต้องทำอะไรต่อ
//   - ลบด่านตรวจออกจาก route ที่ประกาศไว้ → เทสต์นี้แดง
//   - เปิด route ทั้งระบบให้คนอื่น (เช่น "ข้อมูลสาธารณะ") → ต้องแก้ตารางให้เห็นว่าตั้งใจ
//   คนอ่านตารางจะเห็นทันทีว่าอะไรเปิดสาธารณะบ้าง และทำไม
//
// ⚠️ ข้อจำกัดที่ต้องรู้: เทสต์นี้ตรวจว่า "เรียกด่านตรวจได้จริงในโค้ด"
//    ไม่ได้ตรวจว่าผลลัพธ์ถูกใช้ต่อถูกทาง เช่น เรียก requireOwnedGame แล้วโยนทิ้ง
//    การกันเรื่องนั้นต้องมาจากการอ่านโค้ดและเทสต์ระดับ API (ดู scripts/api-isolation.test.mjs)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API_DIR = path.join(ROOT, 'src', 'app', 'api');

const METHOD = '(GET|POST|PUT|PATCH|DELETE)';

/**
 * ประกาศสิทธิ์ของแต่ละ route
 *
 * guards  : ชื่อฟังก์ชันที่ต้องถูกเรียกใน method นั้น (จาก @/lib/auth-server)
 * open    : true = เปิดสาธารณะโดยเจตนา (ต้องเขียนเหตุผลไว้ใน note)
 */
const DECLARED = {
  'health/route.ts': {
    note: 'ตรวจว่าระบบยังตอบอยู่ไหม — ใช้ตอน deploy และหน้า /setup ไม่มีข้อมูลบุคคล',
    methods: { GET: { open: true } },
  },
  'auth/register/route.ts': {
    note: 'ปลายทางของการสมัคร — ต้องเปิด ไม่งั้นไม่มีใครสมัครได้',
    methods: { POST: { open: true } },
  },
  'auth/login/route.ts': {
    note: 'ปลายทางของการเข้าสู่ระบบ — ต้องเปิด ไม่งั้นไม่มีใครเข้าได้',
    methods: { POST: { open: true } },
  },
  'auth/route.ts': {
    note: 'GET ตอบ null แทน 401 โดยตั้งใจ (หน้าเว็บต้องถาม "เข้าสู่ระบบแล้วหรือยัง" ทุกครั้ง); DELETE = ออกจากระบบ เปิดได้เพราะ "ปิดคุกกี้ตัวเอง" ปลอดภัยเสมอ',
    methods: {
      GET: { open: true, alsoCalls: ['getCurrentAccount'] },
      PUT: { guards: ['requireAccount'] },
      DELETE: { open: true },
    },
  },
  'auth/password/route.ts': {
    note: 'เปลี่ยนรหัสผ่าน — ต้องรู้ว่าเป็นใคร ไม่งั้นใครก็เปลี่ยนรหัสครูได้',
    methods: { POST: { guards: ['requireAccount'] } },
  },
  'rooms/route.ts': {
    note: 'นักเรียนต้องค้นหารหัสห้องก่อนมีคุกกี้ใด ๆ — เปิดได้ แต่ห้ามหลุด ownerId',
    methods: { GET: { open: true, alsoCalls: ['publicGame'] } },
  },
  'games/route.ts': {
    note: 'รายการเกมของครู — ต้องจำกัดที่เจ้าของ ไม่งั้นเห็นและลบเกมครูอื่นได้',
    methods: {
      GET: { guards: ['requireAccount'] },
      POST: { guards: ['requireAccount'] },
    },
  },
  'games/[id]/route.ts': {
    note: 'เกมเดียว — ต้องเช็คว่าเป็นของเรา ไม่ใช่แค่ล็อกอิน',
    methods: {
      GET: { guards: ['requireOwnedGame'] },
      PUT: { guards: ['requireOwnedGame'] },
      DELETE: { guards: ['requireOwnedGame'] },
    },
  },
  'missions/route.ts': {
    note: 'ด่านของเกม — ผูกกับเจ้าของเกม',
    methods: {
      GET: { guards: ['requireOwnedGame'] },
      POST: { guards: ['requireOwnedGame'] },
    },
  },
  'missions/[id]/route.ts': {
    note: 'ด่านเดียว — requireAccount แล้วค่อยให้ getMission(id, ownerId) กรอง',
    methods: {
      GET: { guards: ['requireAccount'] },
      PUT: { guards: ['requireAccount'] },
      DELETE: { guards: ['requireAccount'] },
    },
  },
  'students/route.ts': {
    note: 'รายชื่อนักเรียนของครู — ต้องจำกัดที่เจ้าของ',
    methods: {
      GET: { guards: ['requireAccount'] },
      POST: { guards: ['requireAccount'] },
    },
  },
  'students/[id]/route.ts': {
    note: 'นักเรียนเดียว — getStudent(id, ownerId) กรองให้เหลือของตัวเอง',
    methods: {
      GET: { guards: ['requireAccount'] },
      PATCH: { guards: ['requireAccount'] },
      DELETE: { guards: ['requireAccount'] },
    },
  },
  'groups/route.ts': {
    note: 'กลุ่มของครู — เดิมทุกคนเห็นทุกกลุ่ม',
    methods: {
      GET: { guards: ['requireAccount'] },
      POST: { guards: ['requireAccount'] },
      DELETE: { guards: ['requireAccount'] },
    },
  },
  'analytics/route.ts': {
    note: 'สถิติ — เคยรั่วข้ามครู เพราะไม่กรองตามเจ้าของ',
    methods: { GET: { guards: ['requireAccount'] } },
  },
  'teams/route.ts': {
    note: 'จัดทีมในห้อง — ผูกกับเจ้าของเกม',
    methods: {
      GET: { guards: ['requireOwnedGame'] },
      POST: { guards: ['requireOwnedGame'] },
    },
  },
  'players/route.ts': {
    note: 'รายชื่อคนในห้อง — ครูดูได้เฉพาะเกมตัวเอง, นักเรียนดูได้แค่ห้องที่ตัวอยู่',
    methods: {
      GET: { guards: ['requireOwnedGame', 'requirePlayerInGame'] },
      // POST = เข้าห้อง เปิดได้ แต่ต้องผูกกับเจ้าของเกม (ดู getStudent(studentId, game.ownerId))
      POST: { alsoCalls: ['getStudent', 'attachStudentCookie'] },
    },
  },
  'players/[id]/route.ts': {
    note: 'ผู้เล่นเดียว — นักเรียนดูได้แค่ตัวเอง ครูดูได้แค่เกมตัวเอง',
    methods: {
      GET: { guards: ['currentPlayer', 'requireAccount'] },
      PUT: { guards: ['requireAccount'] },
      DELETE: { guards: ['requireAccount'] },
    },
  },
  'players/advance/route.ts': {
    note: 'เลื่อนตำแหน่ง — ต้องเป็นผู้เล่นที่ยิงคำขอนี้จริง ไม่งั้นกดแทนเพื่อนได้',
    methods: { POST: { guards: ['currentPlayer'] } },
  },
  'answers/route.ts': {
    note: 'ส่งคำตอบ — ต้องเป็นตัวเอง ไม่งั้นฟาร์มคะแนนให้คนอื่นได้',
    methods: {
      POST: { guards: ['currentPlayer'] },
      PUT: { guards: ['currentPlayer'] },
    },
  },
  'sessions/route.ts': {
    note: 'GET = นักเรียน poll เวลา/สถานะ จึงเปิด (แต่ต้องเช็คว่าเกมมีจริง); POST/PUT = ครูกดจับเวลา',
    methods: {
      GET: { open: true, alsoCalls: ['getGame'] },
      POST: { guards: ['requireOwnedGame'] },
      PUT: { guards: ['requireOwnedGame'] },
    },
  },
};

/** หาไฟล์ route.ts ทั้งหมดใต้ src/app/api (key = path สัมพัทธ์ ใช้ / ไม่ใช้ \) */
function routeFiles(dir = API_DIR, acc = {}) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) routeFiles(full, acc);
    else if (name === 'route.ts') acc[path.relative(API_DIR, full).split(path.sep).join('/')] = full;
  }
  return acc;
}

/** ตัดคอมเมนต์ออก — ไม่งั้นคำว่า "requireAccount" ในคำอธิบายจะผ่านทั้งที่โค้ดไม่ได้เรียกจริง */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/**
 * หาตำแหน่งวงเล็บปีกกาเท่าไปด้วย { ที่เปิดไว้
 *
 * ข้ามสตริง ('', "", ``) เพราะในโค้ด route มี `status: 404 }` ในข้อความ error
 * ซึ่งถ้านับเป็นวงเล็บ จะได้ตำแหน่งผิดและทำให้ทั้งไฟล์ตรวจไม่ผ่าน
 */
function matchBrace(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      i++;
      while (i < src.length && src[i] !== quote) {
        if (src[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return i;
  }
  return src.length;
}

/**
 * แยกโค้ดของแต่ละ method ออกจากกัน
 *
 * ⚠️ helper ในไฟล์เดียวกัน (เช่น requireSelfPlayer ใน answers) อยู่นอกทุกช่วง
 *    ถ้าไม่เอามารวม เทสต์จะไปหาด่านตรวจที่ซ่อนใน helper แล้วรายงานว่า "ไม่มีด่าน"
 *    ทั้งที่มี — ซึ่งแย่กว่าไม่ตรวจ เพราะทำให้คนหยุดอ่านเทสต์นี้
 *
 *    แต่ก็ใช่วยทั้งไฟล์พร้อมกันไม่ได้ เพราะแล้วด่านใน method หนึ่งจะไปผ่านทุก method
 *    จึงรวมเฉพาะ "ช่วงของตัว helper" เท่านั้น ไม่ใช่ทั้งไฟล์
 */
function methodBodies(src) {
  const decl = new RegExp(`export\\s+(?:async\\s+function\\s+|const\\s+)${METHOD}\\b`, 'g');
  const marks = [];
  let m;
  while ((m = decl.exec(src))) marks.push({ method: m[1], start: m.index });

  const bodies = {};
  for (let i = 0; i < marks.length; i++) {
    const end = i + 1 < marks.length ? marks[i + 1].start : src.length;
    bodies[marks[i].method] = src.slice(marks[i].start, end);
  }

  // helper ระดับโมดูล: function foo( / async function foo( ที่ไม่ได้ถูก export
  const helpers = [];
  const helper = /(^|\n)(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  while ((m = helper.exec(src))) {
    if ((m.index > 0 && src[m.index - 1] === 't') || /^export/.test(src.slice(Math.max(0, m.index - 6), m.index + 1))) {
      continue; // เป็น export function
    }
    const braceAt = src.indexOf('{', m.index);
    if (braceAt < 0) continue;
    const closeAt = matchBrace(src, braceAt);
    helpers.push(src.slice(m.index, closeAt + 1));
  }

  if (helpers.length) {
    const shared = helpers.join('\n');
    for (const method of Object.keys(bodies)) {
      bodies[method] += `\n/* module helpers */\n${shared}`;
    }
  }
  return bodies;
}

// ---------------- เทสต์ ----------------

test('ทุก route ที่แตะข้อมูลครูต้องมีด่านตรวจสิทธิ์ก่อน', () => {
  const files = routeFiles();
  const failures = [];

  for (const [rel, declared] of Object.entries(DECLARED)) {
    const full = path.join(API_DIR, rel);
    const src = stripComments(readFileSync(full, 'utf8'));
    const bodies = methodBodies(src);

    for (const [method, rule] of Object.entries(declared.methods)) {
      const body = bodies[method];
      if (!body) {
        failures.push(`${rel} — ประกาศว่ามี ${method} แต่ในไฟล์ไม่มี handler ตัวนั้น`);
        continue;
      }
      for (const guard of rule.guards || []) {
        if (!new RegExp(`\\b${guard}\\s*\\(`).test(body)) {
          failures.push(
            `${rel} ${method} — ไม่ได้เรียก ${guard}()\n    (${declared.note})`
          );
        }
      }
      for (const extra of rule.alsoCalls || []) {
        if (!new RegExp(`\\b${extra}\\s*\\(`).test(body)) {
          failures.push(
            `${rel} ${method} — ไม่ได้เรียก ${extra}()\n    (${declared.note})`
          );
        }
      }
    }
  }

  assert.deepEqual(
    failures,
    [],
    `พบ route ที่ไม่มีด่านตรวจสิทธิ์:\n  - ${failures.join('\n  - ')}`
  );
});

test('route ใหม่ทุกตัวต้องถูกประกาศสิทธิ์ในเทสต์นี้ (ไม่ใช่แค่ผ่านตอนนี้)', () => {
  const files = Object.keys(routeFiles()).sort();
  const declared = Object.keys(DECLARED).sort();

  assert.deepEqual(
    files.filter((f) => !declared.includes(f)),
    [],
    'มี route.ts ที่ยังไม่ได้ประกาศว่าเปิดให้ใครได้บ้าง\n' +
      ' เพิ่มใน DECLARED พร้อม note อธิบายว่าทำไม\n' +
      ' (ถ้าไม่รู้จะใส่ guard อะไร แปลว่ายังไม่คิดเรื่องสิทธิ์ของมัน — คิดก่อน)'
  );

  assert.deepEqual(
    declared.filter((f) => !files.includes(f)),
    [],
    'ใน DECLARED มี route ที่ไม่มีไฟล์จริงแล้ว (โรงเรียนเปลี่ยนชื่อ/ลบไปหรือยัง?)'
  );
});

test('method ในไฟล์จริงต้องตรงกับที่ประกาศไว้ (ไม่มี handler แอบนอกสายตา)', () => {
  const problems = [];

  for (const [rel, declared] of Object.entries(DECLARED)) {
    const src = stripComments(readFileSync(path.join(API_DIR, rel), 'utf8'));
    const actual = Object.keys(methodBodies(src)).sort();
    const listed = Object.keys(declared.methods).sort();

    for (const method of actual) {
      if (!listed.includes(method)) {
        problems.push(
          `${rel} มี ${method} ที่ไม่ได้ประกาศสิทธิ์ — ` +
            'ถ้าเพิ่งลืมประกาศ ให่เพิ่ม ถ้าเพิ่งเพิ่ม handler มา ให้คิดเรื่องสิทธิ์ก่อน'
        );
      }
    }
    for (const method of listed) {
      if (!actual.includes(method)) {
        problems.push(`${rel} ประกาศ ${method} แต่ไม่มี handler ตัวนั้นในไฟล์`);
      }
    }
  }

  assert.deepEqual(problems, [], problems.join('\n'));
});

test('ทุก route ที่เปิดสาธารณะ ต้องมีคำอธิบายว่าทำไม', () => {
  // route ที่เปิดโดยไม่บอกเหตุผล = การเปิดที่ไม่ได้คิด
  // ระบบนี้เปิดแค่ 7 จุด (health, register, login, "ใครเป็นใคร", logout, rooms, sessions GET)
  // ถ้าวันหนึ่งขึ้นไป 10 จุด แปลว่ามีอะไรผิดไปแน่นอน
  const MAX_OPEN = 7;
  const open = [];
  for (const [rel, declared] of Object.entries(DECLARED)) {
    for (const [method, rule] of Object.entries(declared.methods)) {
      if (rule.open) open.push(`${rel} ${method}`);
    }
  }

  assert.ok(
    open.length <= MAX_OPEN,
    `เปิดสาธารณะ ${open.length} จุด (${open.join(', ')}) — เยอะกว่าที่ตั้งใจไว้ ${MAX_OPEN} จุด\n` +
      ' ต้องกลับไปดูว่ามี route ที่ควรปิดแต่ไม่ได้ปิด หรือมีอะไรหลุดเข้ามาใหม่'
  );

  for (const [rel, declared] of Object.entries(DECLARED)) {
    assert.ok(declared.note && declared.note.length > 10, `${rel} ยังไม่ได้อธิบายว่าทำไม`);
  }
});

test('ด่านตรวจทุกตัวต้องอยู่ในไฟล์เดียวกัน (ไม่มี route เขียนเงื่อนไขเองแยก)', () => {
  // ถ้ามี route ไหนเขียน `if (!session) return 401` เอง
  // แปลว่ามีสองที่ที่ทำหน้าที่เดียวกัน และอีกที่จะถูกแก้ผิด
  // ให้ใช้ requireAccount/requireOwnedGame/... จาก @/lib/auth-server เสมอ
  const strays = [];
  for (const rel of Object.keys(DECLARED)) {
    const src = stripComments(readFileSync(path.join(API_DIR, rel), 'utf8'));
    if (rel.startsWith('auth/')) continue; // ตรวจที่ซึ่งต้องเปิด
    const body = src.replace(/^\s*import[\s\S]*?from\s+['"][^'"]+['"];?$/gm, '');
    if (/\.get\(\s*['"]cq_(session|student)['"]\s*\)/.test(body)) {
      strays.push(`${rel} — อ่านคุกกี้เซสชันเอง ให้ใช้ requireAccount/currentPlayer`);
    }
    if (/getAccountByToken\s*\(/.test(body)) {
      strays.push(`${rel} — แอบยืนยันโทเคนเอง ให้ใช้ requireAccount/currentPlayer`);
    }
  }

  assert.deepEqual(
    strays,
    [],
    `พบ route ที่ตรวจสิทธิ์เองแทนที่จะใช้ด่านกลาง:\n  - ${strays.join('\n  - ')}`
  );
});
