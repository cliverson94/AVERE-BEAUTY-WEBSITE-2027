import crypto from 'node:crypto';

export const json = (res, code, body) => {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
};

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
export async function redis(...cmd) {
  if (!KV_URL || !KV_TOKEN) throw new Error('Database not connected. Add Upstash Redis in Vercel → Storage.');
  const r = await fetch(KV_URL, { method: 'POST', headers: { Authorization: 'Bearer ' + KV_TOKEN }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}
export async function redisPipe(cmds) {
  if (!KV_URL || !KV_TOKEN) throw new Error('Database not connected.');
  if (!cmds.length) return [];
  const r = await fetch(KV_URL.replace(/\/$/, '') + '/pipeline', { method: 'POST', headers: { Authorization: 'Bearer ' + KV_TOKEN }, body: JSON.stringify(cmds) });
  const j = await r.json();
  return j.map(x => x.result);
}
export const hgetallParsed = async key => {
  const flat = (await redis('HGETALL', key)) || [];
  const out = [];
  for (let i = 0; i < flat.length; i += 2) { try { out.push(JSON.parse(flat[i + 1])); } catch (e) {} }
  return out;
};

// Falls back to a secret derived from other settings so login still works if SESSION_SECRET was never added.
const SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update('avere|' + (process.env.STUDIO_LOGINS || '') + '|' + (process.env.STUDIO_PASSWORD || '') + '|' + (KV_TOKEN || '')).digest('hex');
const sign = s => crypto.createHmac('sha256', SECRET).update(s).digest('base64url');
const DAYS = 7;
export function makeSession(res, data) {
  const p = Buffer.from(JSON.stringify({ ...data, exp: Date.now() + DAYS * 864e5 })).toString('base64url');
  res.setHeader('set-cookie', `avs=${p}.${sign(p)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${DAYS * 86400}`);
}
export function clearSession(res) {
  res.setHeader('set-cookie', 'avs=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
}
export function getSession(req) {
  if (!SECRET) return null;
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)avs=([^;]+)/);
  if (!m) return null;
  const [p, s] = m[1].split('.');
  if (!p || !s) return null;
  const a = Buffer.from(sign(p)), b = Buffer.from(s);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try { const u = JSON.parse(Buffer.from(p, 'base64url').toString()); return u.exp > Date.now() ? u : null; } catch (e) { return null; }
}

// STUDIO_LOGINS = "email:password,email:password" — these accounts are owners.
const DEFAULT_OWNERS = ['info@averebeauty.com', 'sophie@averebeauty.com', 'frankudavcak@gmail.com'];
const ownerLogins = () => {
  const out = Object.fromEntries((process.env.STUDIO_LOGINS || '').split(',').map(s => s.trim()).filter(s => s.includes(':')).map(s => { const i = s.indexOf(':'); return [s.slice(0, i).trim().toLowerCase(), s.slice(i + 1).trim()]; }));
  // Simple option: one shared password (STUDIO_PASSWORD) for the owner emails.
  if (process.env.STUDIO_PASSWORD) {
    const list = (process.env.STUDIO_OWNERS || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
    for (const e of (list.length ? list : DEFAULT_OWNERS)) if (out[e] == null) out[e] = process.env.STUDIO_PASSWORD.trim();
  }
  return out;
};
export const owners = () => [...new Set([...Object.keys(ownerLogins()), ...(process.env.STUDIO_OWNERS || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean)])];
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
export const hashPassword = (pw, salt = crypto.randomBytes(16).toString('hex')) => ({ salt, hash: crypto.scryptSync(String(pw), salt, 64).toString('hex') });
export async function checkPassword(email, pw) {
  email = String(email || '').trim().toLowerCase();
  const own = ownerLogins();
  if (own[email] != null) return own[email] !== '' && safeEq(own[email], String(pw).trim());
  let raw = null; try { raw = await redis('HGET', 'studio:users', email); } catch (e) { return false; }
  if (!raw) return false;
  const u = JSON.parse(raw);
  if (!u.hash) return false;
  return safeEq(hashPassword(pw, u.salt).hash, u.hash);
}
export async function lookupUser(email) {
  email = String(email || '').toLowerCase();
  if (owners().includes(email)) return { email, role: 'owner' };
  let raw = null; try { raw = await redis('HGET', 'studio:users', email); } catch (e) { return null; }
  if (!raw) return null;
  const u = JSON.parse(raw);
  if (u.expires && new Date(u.expires + 'T23:59:59') < new Date()) return null;
  return { email, role: u.role, expires: u.expires || null };
}
export async function requireUser(req, res, roles) {
  const s = getSession(req);
  if (!s) { json(res, 401, { error: 'Please sign in.' }); return null; }
  const u = await lookupUser(s.email);
  if (!u) { json(res, 403, { error: 'Your access was removed or has expired.' }); return null; }
  if (roles && !roles.includes(u.role)) { json(res, 403, { error: 'Your role cannot do that.' }); return null; }
  return { ...u, name: s.name || '', picture: s.picture || '' };
}
