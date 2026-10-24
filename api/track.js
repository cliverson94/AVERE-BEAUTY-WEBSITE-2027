import { redisPipe } from './_lib.js';
const dayET = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(d);
const METRICS = ['lcp', 'inp', 'cls', 'ttfb', 'load'];
export default async function handler(req, res) {
  res.statusCode = 204;
  try {
    if (req.method !== 'POST') return res.end();
    let b = req.body; if (typeof b === 'string') b = JSON.parse(b || '{}'); b = b || {};
    if (/bot|crawl|spider|preview|lighthouse/i.test(req.headers['user-agent'] || '')) return res.end();
    const d0 = dayET(), kc = s => 'st:' + s + ':' + d0, clean = x => String(x || '').slice(0, 90).replace(/[^\w:\-]/g, '');
    if (b.type === 'cta' || b.type === 'view') {
      const pg = String(b.page || '/').slice(0, 120).replace(/[^\w\-\/%.]/g, '');
      const ids = (b.type === 'cta' ? [b.id] : (Array.isArray(b.ids) ? b.ids : [])).map(clean).filter(Boolean).slice(0, 20);
      const key = b.type === 'cta' ? 'c' : 'cv';
      const cmds = ids.map(id => ['ZINCRBY', kc(key), 1, id]);
      if (b.type === 'cta' && ids[0]) cmds.push(['ZINCRBY', kc('cp'), 1, ids[0] + '|' + pg]);
      for (const x of ['c', 'cv', 'cp']) cmds.push(['EXPIRE', kc(x), 60 * 60 * 24 * 120]);
      if (cmds.length) await redisPipe(cmds);
      return res.end();
    }
    const page = String(b.page || '/').slice(0, 120).replace(/[^\w\-\/%.]/g, '') || '/';
    if (page.startsWith('/api') || page.startsWith('/studio') || /Studio|Page%20Editor/.test(page)) return res.end();
    const ref = String(b.ref || '').slice(0, 80).replace(/[^\w\-.]/g, '');
    const vid = String(b.vid || '').slice(0, 40).replace(/[^\w]/g, '');
    const v = b.v || {};
    const d = dayET(), k = s => 'st:' + s + ':' + d;
    const cmds = [['HINCRBY', k('t'), 'pv', 1], ['HINCRBY', k('t'), b.mobile ? 'mobile' : 'desktop', 1], ['ZINCRBY', k('p'), 1, page]];
    if (vid) cmds.push(['SADD', k('u'), vid]);
    cmds.push(['ZINCRBY', k('r'), 1, ref || 'Direct']);
    for (const m of METRICS) { const x = Number(v[m]); if (Number.isFinite(x) && x >= 0 && x < 120000) cmds.push(['LPUSH', k('v:' + m), x], ['LTRIM', k('v:' + m), 0, 1999]); }
    const load = Number(v.lcp || v.load);
    if (Number.isFinite(load) && load > 0 && load < 120000) cmds.push(['HINCRBY', k('lt'), page + '|sum', Math.round(load)], ['HINCRBY', k('lt'), page + '|n', 1]);
    for (const s of ['t', 'p', 'u', 'r', 'lt', ...METRICS.map(m => 'v:' + m)]) cmds.push(['EXPIRE', k(s), 60 * 60 * 24 * 120]);
    await redisPipe(cmds);
  } catch (e) {}
  res.end();
}
