import { json, lookupUser, makeSession } from '../_lib.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  const credential = (req.body || {}).credential || '';
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential));
  if (!r.ok) return json(res, 401, { error: 'Google sign-in failed. Try again.' });
  const t = await r.json();
  const verified = t.email_verified === true || t.email_verified === 'true';
  if (t.aud !== process.env.GOOGLE_CLIENT_ID || !verified) return json(res, 401, { error: 'Google sign-in failed. Try again.' });
  const u = await lookupUser(t.email);
  if (!u) return json(res, 403, { error: t.email + ' does not have access. Ask an owner to add you.' });
  makeSession(res, { email: u.email, name: t.name || '', picture: t.picture || '' });
  json(res, 200, { user: { ...u, name: t.name || '', picture: t.picture || '' } });
}
