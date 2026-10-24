import { json, redis, requireUser } from '../_lib.js';
export default async function handler(req, res) {
  const u = await requireUser(req, res, ['owner', 'editor']); if (!u) return;
  try {
    if (req.method === 'GET') {
      const ids = (await redis('ZREVRANGE', 'studio:leads:idx', 0, 299)) || [];
      const rows = ids.length ? await redis('HMGET', 'studio:leads', ...ids) : [];
      return json(res, 200, { leads: rows.filter(Boolean).map(r => JSON.parse(r)) });
    }
    if (req.method === 'PATCH') {
      const id = (req.query || {}).id; const raw = id && await redis('HGET', 'studio:leads', id);
      if (!raw) return json(res, 404, { error: 'Not found' });
      const b = req.body || {}; const lead = JSON.parse(raw);
      if (['New', 'Contacted', 'Booked', 'Not a fit'].includes(b.status)) lead.status = b.status;
      if (typeof b.note === 'string') lead.note = b.note.slice(0, 1000);
      lead.updatedBy = u.email; lead.updatedAt = new Date().toISOString();
      await redis('HSET', 'studio:leads', id, JSON.stringify(lead));
      return json(res, 200, { lead });
    }
    json(res, 405, { error: 'Method not allowed' });
  } catch (e) { json(res, 500, { error: e.message }); }
}
