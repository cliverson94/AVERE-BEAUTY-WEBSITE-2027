import { json, redis, hgetallParsed, owners, requireUser, hashPassword } from '../_lib.js';
export default async function handler(req, res) {
  const u = await requireUser(req, res, ['owner']);
  if (!u) return;
  try {
    if (req.method === 'GET') {
      const added = (await hgetallParsed('studio:users')).map(({ salt, hash, ...rest }) => rest);
      return json(res, 200, { users: [...owners().map(email => ({ email, role: 'owner', fixed: true })), ...added] });
    }
    if (req.method === 'POST') {
      const { email, role, expires, password } = req.body || {};
      const e = String(email || '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return json(res, 400, { error: 'Enter a valid email.' });
      if (String(password || '').length < 10) return json(res, 400, { error: 'Password must be at least 10 characters.' });
      const rec = { email: e, role: ['freelancer', 'editor'].includes(role) ? role : 'freelancer', expires: expires || null, addedBy: u.email, addedAt: new Date().toISOString(), ...hashPassword(password) };
      await redis('HSET', 'studio:users', e, JSON.stringify(rec));
      const { salt, hash, ...safe } = rec;
      return json(res, 200, { user: safe });
    }
    if (req.method === 'DELETE') {
      await redis('HDEL', 'studio:users', String((req.query || {}).email || '').toLowerCase());
      return json(res, 200, { ok: true });
    }
    json(res, 405, { error: 'Method not allowed' });
  } catch (e) { json(res, 500, { error: e.message }); }
}
