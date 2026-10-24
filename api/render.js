import { redis } from './_lib.js';
// Serves each page with its SEO title, description, share image, favicon and structured data in the HTML,
// so Google and social apps (iMessage, Facebook, LinkedIn) see them without running JavaScript.
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let pagesCache = null;
export default async function handler(req, res) {
  const q = req.query || {};
  let file = String(q.f || '').replace(/\.\.|^\//g, '');
  const path = String(q.p || '/');
  const proto = req.headers['x-forwarded-proto'] || 'https', host = req.headers.host;
  const origin = proto + '://' + host;
  // Home page variants: owners pick A, C, random or alternate in Studio → SEO.
  const HOMES = { A: 'Avere Home A.dc.html', B: 'Avere Home B.dc.html', C: 'Avere Home C.dc.html' };
  let variant = '', noStore = false;
  if (path === '/') {
    let mode = 'A';
    try { const h = await redis('HGET', 'studio:seo', '__home'); if (h) mode = JSON.parse(h).mode || 'A'; } catch (e) {}
    const keys = Object.keys(HOMES);
    if (mode === 'random') { variant = keys[Math.floor(Math.random() * keys.length)]; noStore = true; }
    else if (mode === 'alternate') {
      const m = (req.headers.cookie || '').match(/(?:^|;\s*)av_home=([A-Z])/);
      const last = m ? m[1] : keys[keys.length - 1];
      variant = keys[(keys.indexOf(last) + 1) % keys.length] || keys[0];
      res.setHeader('set-cookie', 'av_home=' + variant + '; Path=/; Max-Age=31536000; SameSite=Lax');
      noStore = true;
    } else variant = HOMES[mode] ? mode : 'A';
    file = HOMES[variant];
  }
  const fileUrl = origin + '/' + file.split('/').map(encodeURIComponent).join('/');
  try {
    const r = await fetch(fileUrl);
    if (!r.ok) throw new Error('fetch ' + r.status);
    let html = await r.text();
    let page = {}, site = {}, def = {};
    try {
      const [p, s] = await Promise.all([redis('HGET', 'studio:seo', path), redis('HGET', 'studio:seo', '__site')]);
      page = p ? JSON.parse(p) : {}; site = s ? JSON.parse(s) : {};
    } catch (e) {}
    try {
      if (!pagesCache) pagesCache = (await (await fetch(origin + '/site-pages.json')).json()).pages;
      def = pagesCache.find(x => x.path === path) || {};
    } catch (e) {}
    let ld = '';
    if (path.startsWith('/post/')) {
      try {
        const posts = (await (await fetch(origin + '/blog-posts.json')).json()).posts;
        const post = posts.find(x => '/post/' + x.slug === path);
        if (post) {
          def = { title: post.seoTitle || post.title, desc: post.seoDesc || post.dek, image: post.img };
          ld = JSON.stringify([{ '@context': 'https://schema.org', '@type': 'Article', headline: post.title, description: post.seoDesc || post.dek, image: [post.img], datePublished: post.date, author: { '@type': 'Organization', name: 'Avere Beauty' }, publisher: { '@type': 'Organization', name: 'Avere Beauty' } },
            { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: (post.faq || []).map(([q2, a]) => ({ '@type': 'Question', name: q2, acceptedAnswer: { '@type': 'Answer', text: a } })) }]);
        }
      } catch (e) {}
    }
    const siteUrl = (process.env.SITE_URL || origin).replace(/\/$/, '');
    const title = page.title || def.title || 'Avere Beauty';
    const desc = page.desc || def.desc || site.desc || '';
    const image = page.image || def.image || site.image || '';
    const fav = site.favicon || '';
    html = html.replace(/<title>[\s\S]*?<\/title>/g, '<title>' + esc(title) + '</title>');
    html = html.replace(/<meta name="description" content="[^"]*">/g, '<meta name="description" content="' + esc(desc) + '">');
    const head = [
      '<title>' + esc(title) + '</title>',
      '<meta name="description" content="' + esc(desc) + '">',
      '<link rel="canonical" href="' + esc(siteUrl + path) + '">',
      '<meta property="og:type" content="' + (path.startsWith('/post/') ? 'article' : 'website') + '">',
      '<meta property="og:site_name" content="' + esc(site.siteName || 'Avere Beauty') + '">',
      '<meta property="og:title" content="' + esc(title) + '">',
      '<meta property="og:description" content="' + esc(desc) + '">',
      '<meta property="og:url" content="' + esc(siteUrl + path) + '">',
      image ? '<meta property="og:image" content="' + esc(image) + '"><meta name="twitter:image" content="' + esc(image) + '">' : '',
      '<meta name="twitter:card" content="summary_large_image">',
      fav ? '<link rel="icon" href="' + esc(fav) + '"><link rel="apple-touch-icon" href="' + esc(fav) + '">' : '',
      variant ? '<meta name="home-variant" content="' + variant + '">' : '',
      ld ? '<script type="application/ld+json">' + ld.replace(/</g, '\\u003c') + '</script>' : ''
    ].filter(Boolean).join('\n');
    html = html.replace(/<head>/i, '<head>\n' + head);
    res.statusCode = 200;
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.setHeader('cache-control', noStore ? 'private, no-store' : 'public, s-maxage=300, stale-while-revalidate=86400');
    res.end(html);
  } catch (e) {
    res.statusCode = 307; res.setHeader('location', '/' + encodeURI(file)); res.end();
  }
}
