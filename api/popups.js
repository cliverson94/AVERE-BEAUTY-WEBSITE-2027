import { json, redis, requireUser } from './_lib.js';
// Public GET returns the live pop-up config; PUT (owner/editor) saves it.
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const raw = await redis('GET', 'studio:popups').catch(() => null);
      res.setHeader('cache-control', 'public, max-age=60');
      return json(res, 200, { config: raw ? JSON.parse(raw) : null });
    }
    if (req.method === 'PUT') {
      const u = await requireUser(req, res, ['owner', 'editor']); if (!u) return;
      let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
      const cfg = b && b.config;
      if (!cfg || !Array.isArray(cfg.popups)) return json(res, 400, { error: 'Bad config' });
      const s = JSON.stringify({ ...cfg, updatedBy: u.email, updatedAt: new Date().toISOString() });
      if (s.length > 60000) return json(res, 400, { error: 'Config too large' });
      await redis('SET', 'studio:popups', s);
      return json(res, 200, { ok: true });
    }
    json(res, 405, { error: 'Method not allowed' });
  } catch (e) { json(res, 500, { error: e.message }); }
}
