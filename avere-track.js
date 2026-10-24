// Avere site analytics: page views, sources, devices and real load times (Core Web Vitals). No cookies, no personal data.
(function () {
  if (window.__avTracked) return; window.__avTracked = 1;
  if (/[?&]edit=1/.test(location.search)) return;
  if (!/(pghbotox\.com|averebeauty\.com|vercel\.app)$/.test(location.hostname)) return;
  var vid = '';
  try { vid = localStorage.getItem('av_vid') || ''; if (!vid) { vid = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('av_vid', vid); } } catch (e) {}
  var ref = '';
  try { if (document.referrer && document.referrer.indexOf(location.hostname) < 0) ref = new URL(document.referrer).hostname.replace(/^www\./, ''); } catch (e) {}
  var q = new URLSearchParams(location.search); ref = q.get('utm_source') || ref;
  var v = {};
  function obs(type, fn, opts) { try { new PerformanceObserver(function (l) { fn(l.getEntries()); }).observe(Object.assign({ type: type, buffered: true }, opts || {})); } catch (e) {} }
  obs('largest-contentful-paint', function (es) { var e = es[es.length - 1]; if (e) v.lcp = Math.round(e.startTime); });
  var cls = 0; obs('layout-shift', function (es) { es.forEach(function (e) { if (!e.hadRecentInput) cls += e.value; }); v.cls = +cls.toFixed(3); });
  var inp = 0; obs('event', function (es) { es.forEach(function (e) { inp = Math.max(inp, e.duration); }); v.inp = Math.round(inp); }, { durationThreshold: 40 });
  var sent = false;
  function flush() {
    if (sent) return; sent = true;
    var n = performance.getEntriesByType('navigation')[0];
    if (n) { v.ttfb = Math.round(n.responseStart); v.load = Math.round(n.loadEventEnd || n.domContentLoadedEventEnd || 0) || undefined; }
    var hv = document.querySelector('meta[name="home-variant"]');
    var body = JSON.stringify({ page: hv ? '/home-' + hv.content.toLowerCase() : location.pathname, ref: ref, mobile: matchMedia('(max-width: 760px)').matches, vid: vid, v: v });
    if (navigator.sendBeacon) navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
    else fetch('/api/track', { method: 'POST', body: body, keepalive: true, headers: { 'content-type': 'application/json' } });
  }

  // CTA tracking: clicks on [data-cta] (and any link to the financing page), views of [data-cta-unit]
  function send(o) { var b = JSON.stringify(Object.assign({ page: location.pathname, vid: vid }, o)); if (navigator.sendBeacon) navigator.sendBeacon('/api/track', new Blob([b], { type: 'application/json' })); else fetch('/api/track', { method: 'POST', body: b, keepalive: true, headers: { 'content-type': 'application/json' } }); }
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-cta], a[href*="inancing"]'); if (!el) return;
    var id = el.getAttribute('data-cta') || ('fin:link:' + location.pathname.replace(/[^\w]+/g, '-').slice(0, 40));
    send({ type: 'cta', id: id });
  }, true);
  var seen = {}, queue = [], qt;
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) { es.forEach(function (en) { var id = en.target.getAttribute('data-cta-unit'); if (en.isIntersecting && id && !seen[id]) { seen[id] = 1; queue.push(id); clearTimeout(qt); qt = setTimeout(function () { send({ type: 'view', ids: queue.splice(0) }); }, 1500); } }); }, { threshold: 0.5 }) : null;
  function scan() { if (!io) return; document.querySelectorAll('[data-cta-unit]:not([data-av-obs])').forEach(function (el) { el.setAttribute('data-av-obs', '1'); io.observe(el); }); }
  try { new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
  scan();
  addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });
  addEventListener('pagehide', flush);
  setTimeout(flush, 12000);
})();
