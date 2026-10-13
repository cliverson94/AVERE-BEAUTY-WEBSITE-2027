import { json, redis, lookupUser, makeSession, checkPassword, owners } from '../_lib.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  const email = String((req.body || {}).email || '').trim().toLowerCase();
  const password = String((req.body || {}).password || '');
  if (!email || !password) return json(res, 400, { error: 'Enter your email and password.' });
  const key = 'studio:fail:' + email;
  try {
    const fails = Number(await redis('GET', key)) || 0;
    if (fails >= 8) return json(res, 429, { error: 'Too many tries. Wait 15 minutes and try again.' });
    if (!(process.env.STUDIO_LOGINS || '').includes(':')) return json(res, 500, { error: 'STUDIO_LOGINS is missing in Vercel, or the site was not redeployed after adding it.' });
    const known = owners().includes(email) || !!(await redis('HGET', 'studio:users', email));
    if (!known) return json(res, 401, { error: email + ' is not set up. Check the spelling, or add it to STUDIO_LOGINS in Vercel and redeploy.' });
    const ok = await checkPassword(email, password);
    if (!ok) {
      await redis('INCR', key); await redis('EXPIRE', key, 900);
      return json(res, 401, { error: 'Wrong password. ' + (7 - fails) + ' tries left before a 15-minute lock.' });
    }
    const u = await lookupUser(email);
    if (!u) return json(res, 403, { error: 'Your access has expired. Ask an owner to extend it.' });
    await redis('DEL', key);
    makeSession(res, { email: u.email });
    json(res, 200, { user: u });
  } catch (e) { json(res, 500, { error: e.message }); }
}
