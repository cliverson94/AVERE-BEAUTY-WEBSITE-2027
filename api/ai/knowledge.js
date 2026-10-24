import { json, redis, requireUser } from '../_lib.js';
export default async function handler(req, res) {
  const u = await requireUser(req, res, ['owner']); if (!u) return;
  try {
    if (req.method === 'GET') return json(res, 200, { text: (await redis('GET', 'studio:ai:knowledge')) || '' });
    if (req.method === 'PUT') { const t = String((req.body || {}).text || '').slice(0, 30000); await redis('SET', 'studio:ai:knowledge', t); return json(res, 200, { ok: true }); }
    json(res, 405, { error: 'Method not allowed' });
  } catch (e) { json(res, 500, { error: e.message }); }
}
