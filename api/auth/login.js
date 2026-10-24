import { json, redis, lookupUser, makeSession, checkPassword, owners } from '../_lib.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } } b = b || {};
  const email = String(b.email || '').trim().toLowerCase();
  const password = String(b.password || '');
  if (!email || !password) return json(res, 400, { error: 'Enter your email and password.' });
  if (!owners().length && !process.env.STUDIO_PASSWORD) return json(res, 500, { error: 'No logins are set up in Vercel yet. Add STUDIO_PASSWORD (Settings → Environment Variables), then Redeploy.' });
  const key = 'studio:fail:' + email;
  let fails = 0;
  try { fails = Number(await redis('GET', key)) || 0; } catch (e) {}
  if (fails >= 8) return json(res, 429, { error: 'Too many tries. Wait 15 minutes, or ask an owner to reset it.' });
  const ok = await checkPassword(email, password);
  if (!ok) {
    try { await redis('INCR', key); await redis('EXPIRE', key, 900); } catch (e) {}
    const known = owners().includes(email);
    return json(res, 401, { error: known ? 'Wrong password for ' + email + '. Passwords are case-sensitive.' : email + ' is not set up as a Studio login.' });
  }
  const u = await lookupUser(email);
  if (!u) return json(res, 403, { error: 'Your access has expired. Ask an owner to extend it.' });
  try { await redis('DEL', key); } catch (e) {}
  makeSession(res, { email: u.email });
  json(res, 200, { user: u });
}
