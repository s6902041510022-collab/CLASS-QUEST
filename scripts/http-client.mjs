// ตัวช่วยสำหรับเทสต์ที่ยิง API จริง
//
// ทำไมต้องมีการจำคุกกี้เอง
// ระบบนี้แยกสิทธิ์ด้วยคุกกี้ ไม่ใช่ด้วย Authorization header
// ถ้าเทสต์ยิงตรง ๆ ด้วย fetch ธรรมดา ทุกคำขอจะเป็น "คนแปลกหน้า" เสมอ
// แล้วทดสอบที่ต้องการ (นักเรียนตอบข้อ, ครูอ่านสถิติ) จะพังไปเปล่า ๆ
//
// ที่สำคัญ: ต้องมี "คนละ client" สำหรับครูกับนักเรียน
// ถ้าใช้ตัวเดียวกัน คุกกี้ cq_session (ครู) จะไปติดกับคำขอของนักเรียน
// แล้วทดสอบจะผ่านทั้งที่จริง ๆ หน้าเว็บไม่ได้เป็นแบบนั้น

/**
 * client แบบเก็บคุกกี้ไว้ใช้ต่อ (คล้าย session ของ fetch ในภาษาอื่น)
 */
export function makeClient(base) {
  const jar = new Map();

  const cookieHeader = () =>
    [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');

  /** เก็บคุกกี้จาก set-cookie (รองรับหลายค่าใน header เดียว) */
  function remember(res) {
    const raw =
      typeof res.headers.getSetCookie === 'function'
        ? res.headers.getSetCookie()
        : [res.headers.get('set-cookie')].filter(Boolean);
    for (const one of raw) {
      // เก็บแค่ name=value ก่อน ; แล้วทิ้งค่าที่ = "" (ลบคุกกี้)
      const pair = one.split(';')[0];
      const eq = pair.indexOf('=');
      if (eq < 0) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (value === '') jar.delete(name);
      else jar.set(name, value);
    }
  }

  async function request(method, url, body, headers = {}) {
    const res = await fetch(base + url, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(jar.size ? { Cookie: cookieHeader() } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    remember(res);
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { _raw: text };
    }
    return { status: res.status, json, headers: res.headers };
  }

  return {
    jar,
    get cookies() {
      return Object.fromEntries(jar);
    },
    get: (url) => request('GET', url),
    post: (url, body) => request('POST', url, body ?? {}),
    put: (url, body) => request('PUT', url, body ?? {}),
    patch: (url, body) => request('PATCH', url, body ?? {}),
    del: (url) => request('DELETE', url),
  };
}

/** ตรวจว่าคำขอสำเร็จ — พร้อมพิมพ์เนื้อหาที่ได้กลับมาไว้ในข้อความ error */
export function ok(res, what) {
  assertStatus(res, [200, 201], what);
}

export function assertStatus(res, allowed, what) {
  if (!allowed.includes(res.status)) {
    throw new Error(
      `${what}: ได้สถานะ ${res.status} แต่คาดว่า ${allowed.join('/')} — ` +
        JSON.stringify(res.json).slice(0, 400)
    );
  }
  return res;
}

/** ชื่อผู้ใช้สุ่ม ที่ไม่ซ้ำกันข้ามรอบเทสต์ (ฐานข้อมูลจะเก็บของจริง ไม่ใช่ mock) */
let counter = 0;
export function uniqueName(prefix) {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter}`;
}
