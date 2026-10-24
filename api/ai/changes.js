import { json, redis, requireUser } from '../_lib.js';
import { gh, getFile, putFile, deleteFile, PROTECTED } from '../_gh.js';

const save = p => redis('HSET', 'studio:ai', p.id, JSON.stringify(p));
async function previewUrl(branch) {
  const deps = await gh('/deployments?ref=' + encodeURIComponent(branch) + '&per_page=5');
  for (const d of deps || []) {
    const st = await gh('/deployments/' + d.id + '/statuses?per_page=5');
    const ok = (st || []).find(s => s.state === 'success');
    if (ok) return ok.environment_url || ok.target_url;
    const bad = (st || []).find(s => s.state === 'failure' || s.state === 'error');
    if (bad) return 'failed';
  }
  return null;
}

export default async function handler(req, res) {
  const u = await requireUser(req, res, ['owner']); if (!u) return;
  try {
    if (req.method === 'GET') {
      const ids = (await redis('ZREVRANGE', 'studio:ai:idx', 0, 29)) || [];
      const list = (ids.length ? await redis('HMGET', 'studio:ai', ...ids) : []).filter(Boolean).map(r => JSON.parse(r));
      for (const p of list) if (p.status === 'testing' && !p.preview) { try { const url = await previewUrl(p.branch); if (url) { p.preview = url; await save(p); } } catch (e) {} }
      const spent = (Number(await redis('GET', 'ai:cost:' + new Date().toISOString().slice(0, 7))) || 0) / 1e6;
      return json(res, 200, { changes: list, spent, cap: Number(process.env.AI_MONTHLY_CAP_USD || 20) });
    }
    const { id, action } = req.body || {};
    const raw = id && await redis('HGET', 'studio:ai', id);
    if (!raw) return json(res, 404, { error: 'Not found' });
    const p = JSON.parse(raw);
    const msg = 'Studio · Claude: ' + p.summary.slice(0, 60) + ' (approved by ' + u.email + ')';

    if (action === 'apply' && p.type === 'content') {
      const cur = await redis('HGET', 'studio:content', p.page);
      const rec = cur ? JSON.parse(cur) : {};
      const data = { ...(rec.draft || rec.live || {}) };
      data.replace = [...(data.replace || []), ...p.edits.map(e => ({ find: e.find, replace: e.replace }))];
      if (p.seo) data.seo = { ...(data.seo || {}), ...(p.seo.title ? { title: p.seo.title } : {}), ...(p.seo.description ? { desc: p.seo.description } : {}) };
      await redis('HSET', 'studio:content', p.page, JSON.stringify({ ...rec, draft: data, updatedBy: u.email, updatedAt: new Date().toISOString() }));
      p.status = 'draft'; await save(p); return json(res, 200, { change: p });
    }
    if (action === 'test' && p.type === 'code' && p.status === 'proposed') {
      const branch = 'studio-' + p.id;
      const main = await gh('/git/ref/heads/main');
      await gh('/git/refs', { method: 'POST', body: JSON.stringify({ ref: 'refs/heads/' + branch, sha: main.object.sha }) });
      p.base = [];
      for (const f of p.files) {
        if (PROTECTED.test(f.path)) throw new Error('Protected file: ' + f.path);
        const cur = await getFile(f.path, branch);
        let text = f.new_content;
        if (text == null) { text = cur.text; for (const e of f.edits || []) { if (text.split(e.find).length !== 2) throw new Error('Edit no longer matches ' + f.path + '. Ask Claude again.'); text = text.replace(e.find, () => e.replace); } }
        p.base.push({ path: f.path, existed: !!cur });
        await putFile(f.path, text, branch, cur && cur.sha, msg);
      }
      p.branch = branch; p.status = 'testing'; p.preview = null; await save(p); return json(res, 200, { change: p });
    }
    if (action === 'golive' && p.status === 'testing') {
      const before = [];
      for (const b of p.base) { const f = await getFile(b.path, 'main'); before.push({ path: b.path, text: f ? f.text : null }); }
      await redis('HSET', 'studio:ai:undo', p.id, JSON.stringify(before));
      await gh('/merges', { method: 'POST', body: JSON.stringify({ base: 'main', head: p.branch, commit_message: msg }) });
      await gh('/git/refs/heads/' + p.branch, { method: 'DELETE' }).catch(() => {});
      p.status = 'live'; p.liveAt = new Date().toISOString(); await save(p); return json(res, 200, { change: p });
    }
    if (action === 'discard' && (p.status === 'testing' || p.status === 'proposed')) {
      if (p.branch) await gh('/git/refs/heads/' + p.branch, { method: 'DELETE' }).catch(() => {});
      p.status = 'discarded'; await save(p); return json(res, 200, { change: p });
    }
    if (action === 'undo' && p.status === 'live') {
      const before = JSON.parse((await redis('HGET', 'studio:ai:undo', p.id)) || '[]');
      for (const b of before) {
        const cur = await getFile(b.path, 'main');
        if (b.text == null) { if (cur) await deleteFile(b.path, 'main', cur.sha, 'Undo: ' + msg); }
        else await putFile(b.path, b.text, 'main', cur && cur.sha, 'Undo: ' + msg);
      }
      p.status = 'undone'; await save(p); return json(res, 200, { change: p });
    }
    json(res, 400, { error: 'That action is not available for this change.' });
  } catch (e) { json(res, 500, { error: e.message }); }
}
