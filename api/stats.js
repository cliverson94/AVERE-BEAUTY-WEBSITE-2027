import { json, redisPipe, hgetallParsed, redis, requireUser } from './_lib.js';
const dayET = d => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(d);
const METRICS = ['lcp', 'inp', 'cls', 'ttfb'];
const p75 = arr => { if (!arr.length) return null; const s = arr.map(Number).sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * 0.75))]; };
const pairs = flat => { const o = {}; for (let i = 0; i < (flat || []).length; i += 2) o[flat[i]] = Number(flat[i + 1]); return o; };
export default async function handler(req, res) {
  const u = await requireUser(req, res); if (!u) return;
  try {
    const n = Math.min(90, Math.max(1, Number((req.query || {}).days) || 7));
    const days = Array.from({ length: n }, (_, i) => dayET(new Date(Date.now() - i * 864e5))).reverse();
    const cmds = [];
    for (const d of days) {
      const k = s => 'st:' + s + ':' + d;
      cmds.push(['HGETALL', k('t')], ['SCARD', k('u')], ['ZRANGE', k('p'), 0, -1, 'WITHSCORES'], ['ZRANGE', k('r'), 0, -1, 'WITHSCORES'], ['HGETALL', k('lt')], ...METRICS.map(m => ['LRANGE', k('v:' + m), 0, -1]), ['ZRANGE', k('c'), 0, -1, 'WITHSCORES'], ['ZRANGE', k('cv'), 0, -1, 'WITHSCORES']);
    }
    const out = await redisPipe(cmds);
    const per = 7 + METRICS.length;
    const series = [], pages = {}, refs = {}, lt = {}, vit = Object.fromEntries(METRICS.map(m => [m, []]));
    let mobile = 0, desktop = 0; const ctaC = {}, ctaV = {};
    days.forEach((d, i) => {
      const r = out.slice(i * per, i * per + per);
      const t = pairs(r[0]);
      series.push({ day: d, pv: t.pv || 0, uv: Number(r[1]) || 0 });
      mobile += t.mobile || 0; desktop += t.desktop || 0;
      for (const [p, c] of Object.entries(pairs(r[2]))) pages[p] = (pages[p] || 0) + c;
      for (const [p, c] of Object.entries(pairs(r[3]))) refs[p] = (refs[p] || 0) + c;
      for (const [f, c] of Object.entries(pairs(r[4]))) { const [p, w] = f.split('|'); lt[p] = lt[p] || { sum: 0, n: 0 }; lt[p][w] += c; }
      METRICS.forEach((m, j) => vit[m].push(...(r[5 + j] || [])));
      for (const [p, c] of Object.entries(pairs(r[5 + METRICS.length]))) ctaC[p] = (ctaC[p] || 0) + c;
      for (const [p, c] of Object.entries(pairs(r[6 + METRICS.length]))) ctaV[p] = (ctaV[p] || 0) + c;
    });
    const media = await hgetallParsed('studio:media');
    const content = await hgetallParsed('studio:content').catch(() => []);
    const drafts = [];
    const flat = (await redis('HKEYS', 'studio:content')) || [];
    flat.forEach((p, i) => { const c = content[i]; if (c && c.updatedAt && c.updatedAt !== c.publishedAt) drafts.push({ page: p, by: c.updatedBy, at: c.updatedAt }); });
    json(res, 200, {
      days: n, series,
      totals: { pv: series.reduce((a, s) => a + s.pv, 0), uv: series.reduce((a, s) => a + s.uv, 0), mobile, desktop },
      pages: Object.entries(pages).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([page, views]) => ({ page, views, load: lt[page] && lt[page].n ? Math.round(lt[page].sum / lt[page].n) : null })),
      refs: Object.entries(refs).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([source, views]) => ({ source, views })),
      vitals: Object.fromEntries(METRICS.map(m => [m, p75(vit[m])])), samples: vit.lcp.length,
      library: { total: media.length, noAlt: media.filter(m => !m.alt).length, pending: media.filter(m => m.status === 'pending').length, bytes: media.reduce((a, m) => a + (m.bytes || 0), 0), saved: media.reduce((a, m) => a + Math.max(0, (m.origBytes || 0) - (m.bytes || 0)), 0) },
      drafts,
      ctas: [...new Set([...Object.keys(ctaC), ...Object.keys(ctaV)])].map(id => ({ id, clicks: ctaC[id] || 0, views: ctaV[id] || 0 })).sort((a, b) => b.clicks - a.clicks).slice(0, 40),
      finPage: pages['/financing'] || 0
    });
  } catch (e) { json(res, 500, { error: e.message }); }
}
