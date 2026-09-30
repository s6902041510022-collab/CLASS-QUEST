// Mock ของ Upstash Redis REST API — ใช้ทดสอบโหมด Redis โบ���ต้องต่อของจริง
//
// ทำไมต้องมี
// - ฝั่ง Redis (kvBackend) เป็นโหมดที่ deploy บน Vercel ต้องใช้ แต่เดิมไม่มีเทสต์ไปแตะเลย
//   เพราะต้องมี Redis ของจริง ผลคือบั๊กในโค้ด Redis จะไม่มีวันโผล่จนกว่าจะ deploy แล้วพัง
// - โค้ดฝั่ง Redis ใช้แค่ GET / SET (NX, PX) / DEL ตามรูปแบบ Upstash REST
//   คือ POST JSON array ไปที่ URL แล้วได้ { result } หรือ { error }
//
// ใช้: import { startMockUpstash } from './mock-upstash.mjs'
//      const mock = await startMockUpstash();
//      process.env.KV_REST_API_URL = mock.url;
import http from 'node:http';

/** key -> { value, expiresAt|null } */
const empty = () => new Map();

export async function startMockUpstash(options = {}) {
  const store = empty();
  /** ทุกคำสั่งที่ client ส่งมา ใช้ตรวจว่าเรียกไปตามที่คาด */
  const calls = [];

  const expired = (key) => {
    const e = store.get(key);
    if (!e) return true;
    if (e.expiresAt && e.expiresAt <= Date.now()) {
      store.delete(key);
      return true;
    }
    return false;
  };

  function run(cmd) {
    if (!Array.isArray(cmd)) throw new Error('คำสั่งต้องเป็น array');
    const [op, key, value, ...rest] = cmd;

    if (op === 'GET') {
      if (expired(key)) return null;
      return store.get(key).value;
    }

    if (op === 'SET') {
      // NX = set ได้เฉพาะตอนยังไม่มีค่า (ใช้ทำล็อกแบบกระจาย)
      if (rest.includes('NX') && !expired(key)) return null;
      const pxAt = rest.indexOf('PX');
      const ttl = pxAt >= 0 ? Number(rest[pxAt + 1]) : null;
      store.set(key, { value: String(value), expiresAt: ttl ? Date.now() + ttl : null });
      return 'OK';
    }

    if (op === 'DEL') {
      return store.delete(key) ? 1 : 0;
    }

    throw new Error(`mock ไม่รองรับคำสั่ง "${op}"`);
  }

  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const reply = (payload) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(payload));
      };

      // Upstash บอกผิดด้วย 401 ถ้าไม่มี token — จำลองให้เหมือนจริง
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) return reply({ error: 'ERR unauthenticated' });

      let cmd;
      try {
        cmd = JSON.parse(raw);
      } catch {
        return reply({ error: 'ERR invalid JSON' });
      }
      calls.push(cmd);
      try {
        return reply({ result: run(cmd) });
      } catch (err) {
        return reply({ error: String(err?.message || err) });
      }
    });
  });

  // port 0 = ให้ระบบเลือก port ว่างให้ ไม่ชนกับ dev server ที่รันอยู่
  await new Promise((resolve) => server.listen(options.port || 0, '127.0.0.1', resolve));
  const { port } = server.address();

  return {
    url: `http://127.0.0.1:${port}`,
    calls,
    /** ดูค่าที่เก็บไว้ โดยไม่ต้องผ่าน protocol (ใช้ตรวจว่าเขียนลง Redis จริง) */
    peek: (key) => store.get(key)?.value ?? null,
    has: (key) => store.has(key),
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
