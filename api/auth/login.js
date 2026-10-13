import { json, redis, lookupUser, makeSession, checkPassword } from '../_lib.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  const email = String((req.body || {}).email || '').trim().toLowerCase();
  const password = String((req.body || {}).password || '');
  if (!email || !password) return json(res, 400, { error: 'Enter your email and password.' });
  const key = 'studio:fail:' + email;
  try {
    const fails = Number(await redis('GET', key)) || 0;
    if (fails >= 8) return json(res, 429, { error: 'Too many tries. Wait 15 minutes and try again.' });
    const ok = await checkPassword(email, password);
    const u = ok && await lookupUser(email);
    if (!u) {
      await redis('INCR', key); await redis('EXPIRE', key, 900);
      return json(res, 401, { error: 'Email or password is wrong, or your access has expired.' });
    }
    await redis('DEL', key);
    makeSession(res, { email: u.email });
    json(res, 200, { user: u });
  } catch (e) { json(res, 500, { error: e.message }); }
}
