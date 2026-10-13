import crypto from 'node:crypto';
import { del } from '@vercel/blob';
import { json, redis, hgetallParsed, requireUser } from '../_lib.js';

const EDITABLE = ['title', 'alt', 'labels', 'boards', 'status'];
const clean = (o = {}) => Object.fromEntries(Object.entries(o).filter(([k]) => EDITABLE.includes(k)));

export default async function handler(req, res) {
  const u = await requireUser(req, res);
  if (!u) return;
  try {
    if (req.method === 'GET') {
      const items = (await hgetallParsed('studio:media')).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      return json(res, 200, { items });
    }
    if (req.method === 'POST') {
      const b = req.body || {};
      if (!b.url) return json(res, 400, { error: 'Missing file URL' });
      const item = {
        id: crypto.randomUUID(), url: b.url, thumbUrl: b.thumbUrl || b.url, type: b.type === 'video' ? 'video' : 'image',
        file: String(b.file || '').slice(0, 200), width: b.width || 0, height: b.height || 0, bytes: b.bytes || 0, origBytes: b.origBytes || 0,
        duration: b.duration || 0, hash: b.hash || '', ...clean(b),
        status: u.role === 'freelancer' ? 'pending' : 'approved',
        createdBy: u.email, createdAt: new Date().toISOString()
      };
      await redis('HSET', 'studio:media', item.id, JSON.stringify(item));
      return json(res, 200, { item });
    }
    const id = (req.query || {}).id;
    const raw = id && await redis('HGET', 'studio:media', id);
    if (!raw) return json(res, 404, { error: 'Not found' });
    const item = JSON.parse(raw);
    if (req.method === 'PATCH') {
      if (u.role === 'freelancer' && item.createdBy !== u.email) return json(res, 403, { error: 'You can only edit your own uploads.' });
      const patch = clean(req.body);
      if (u.role === 'freelancer') delete patch.status;
      const next = { ...item, ...patch, updatedBy: u.email, updatedAt: new Date().toISOString() };
      await redis('HSET', 'studio:media', id, JSON.stringify(next));
      return json(res, 200, { item: next });
    }
    if (req.method === 'DELETE') {
      if (u.role !== 'owner') return json(res, 403, { error: 'Only owners can delete.' });
      await del([item.url, item.thumbUrl].filter((x, i, a) => x && a.indexOf(x) === i)).catch(() => {});
      await redis('HDEL', 'studio:media', id);
      return json(res, 200, { ok: true });
    }
    json(res, 405, { error: 'Method not allowed' });
  } catch (e) { json(res, 500, { error: e.message }); }
}
