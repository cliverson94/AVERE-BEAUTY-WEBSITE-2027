import { json, redis, requireUser } from './_lib.js';
const clean = (o = {}) => ({ title: String(o.title || '').slice(0, 120), desc: String(o.desc || '').slice(0, 320), image: String(o.image || '').slice(0, 600) });
export default async function handler(req, res) {
  const u = await requireUser(req, res, ['owner', 'editor']); if (!u) return;
  try {
    if (req.method === 'GET') {
      const flat = (await redis('HGETALL', 'studio:seo')) || [];
      const out = {}; for (let i = 0; i < flat.length; i += 2) { try { out[flat[i]] = JSON.parse(flat[i + 1]); } catch (e) {} }
      return json(res, 200, { seo: out });
    }
    if (req.method === 'PUT') {
      const b = req.body || {};
      if (b.path === '__home') {
        const mode = ['A', 'B', 'C', 'random', 'alternate'].includes(b.mode) ? b.mode : 'A';
        await redis('HSET', 'studio:seo', '__home', JSON.stringify({ mode, by: u.email, at: new Date().toISOString() })); return json(res, 200, { ok: true });
      }
      if (b.path === '__site') {
        const site = { favicon: String(b.favicon || '').slice(0, 600), image: String(b.image || '').slice(0, 600), siteName: String(b.siteName || 'Avere Beauty').slice(0, 80), desc: String(b.desc || '').slice(0, 320) };
        await redis('HSET', 'studio:seo', '__site', JSON.stringify(site)); return json(res, 200, { ok: true });
      }
      const path = String(b.path || '');
      if (!path.startsWith('/')) return json(res, 400, { error: 'Bad page' });
      const rec = { ...clean(b), updatedBy: u.email, updatedAt: new Date().toISOString() };
      await redis('HSET', 'studio:seo', path, JSON.stringify(rec)); return json(res, 200, { ok: true, rec });
    }
    json(res, 405, { error: 'Method not allowed' });
  } catch (e) { json(res, 500, { error: e.message }); }
}
