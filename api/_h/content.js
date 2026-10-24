import { json, redis, requireUser } from '../_lib.js';
// Page content edits. One record per page: { live, draft, updatedBy, updatedAt, publishedBy, publishedAt }.
export default async function handler(req, res) {
  const page = String((req.query || {}).page || '').replace(/[^a-z0-9-]/gi, '').slice(0, 80);
  if (!page) return json(res, 400, { error: 'Missing page' });
  const stage = (req.query || {}).stage === 'draft' ? 'draft' : 'live';
  try {
    const raw = await redis('HGET', 'studio:content', page);
    const rec = raw ? JSON.parse(raw) : {};
    if (req.method === 'GET') {
      if (stage === 'live') {
        res.setHeader('cache-control', 'public, s-maxage=10, stale-while-revalidate=60');
        res.setHeader('content-type', 'application/json');
        return res.end(JSON.stringify({ data: rec.live || {} }));
      }
      const u = await requireUser(req, res); if (!u) return;
      return json(res, 200, { data: rec.draft || rec.live || {}, meta: { updatedBy: rec.updatedBy, updatedAt: rec.updatedAt, publishedBy: rec.publishedBy, publishedAt: rec.publishedAt } });
    }
    if (req.method === 'PUT') {
      const u = await requireUser(req, res); if (!u) return;
      const data = (req.body || {}).data || {};
      if (JSON.stringify(data).length > 400000) return json(res, 413, { error: 'Too much content. Upload photos to the library instead of pasting them.' });
      const now = new Date().toISOString();
      let next = { ...rec, draft: data, updatedBy: u.email, updatedAt: now };
      if (stage === 'live') {
        if (u.role === 'freelancer') return json(res, 403, { error: 'Freelancer changes need an owner to publish.' });
        next = { ...next, live: data, publishedBy: u.email, publishedAt: now };
      }
      await redis('HSET', 'studio:content', page, JSON.stringify(next));
      return json(res, 200, { ok: true, at: now });
    }
    json(res, 405, { error: 'Method not allowed' });
  } catch (e) { json(res, 500, { error: e.message }); }
}
