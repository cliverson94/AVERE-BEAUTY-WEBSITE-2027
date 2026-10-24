// Avere Studio live-content layer. Pages load this; it applies saved edits and, with ?edit=1, makes the page editable in place.
(function () {
  const meta = document.querySelector('meta[name="cms-page"]');
  const PAGE = meta ? meta.content : decodeURIComponent(location.pathname.split('/').pop()).replace(/\.dc\.html$|\.html$/, '').replace(/^Avere /, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const EDIT = /[?&]edit=1/.test(location.search);
  const LIVE = 'avere-cms:' + PAGE + ':live', DRAFT = 'avere-cms:' + PAGE + ':draft';
  const read = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  // Preview fallback: browser storage. On the live site, content comes from /api/content.
  let data = (EDIT ? read(DRAFT) || read(LIVE) : read(LIVE)) || {};
  window.__cmsData = data;
  fetch('/api/content?page=' + encodeURIComponent(PAGE) + (EDIT ? '&stage=draft' : ''), { credentials: 'same-origin' })
    .then(r => (r.ok && (r.headers.get('content-type') || '').includes('json')) ? r.json() : null)
    .then(j => { if (j && j.data) set(j.data); })
    .catch(() => {});
  const orig = {};
  let origTitle = null, origDesc = null;

  const sections = () => [...document.querySelectorAll('section[data-screen-label]')];
  const label = s => s.getAttribute('data-screen-label');
  const editables = sec => [...sec.querySelectorAll('h1,h2,h3,h4,p,span,a,img,li,button')].filter(el => {
    if (el.closest('[data-cms-skip]')) return false;
    if (el.tagName === 'IMG') return true;
    if (el.tagName === 'BUTTON') return false;
    return el.children.length === 0 && el.textContent.trim().length > 0;
  });
  function scan() {
    const out = [];
    sections().forEach(sec => editables(sec).forEach((el, i) => {
      const key = label(sec) + '#' + i;
      el.dataset.cmsKey = key;
      if (!orig[key]) orig[key] = el.tagName === 'IMG' ? { src: el.getAttribute('src'), alt: el.alt } : { text: el.textContent, href: el.tagName === 'A' ? el.getAttribute('href') : null };
      out.push(el);
    }));
    return out;
  }
  function apply() {
    const t = data.texts || {}, im = data.imgs || {}, ln = data.links || {};
    scan().forEach(el => {
      const k = el.dataset.cmsKey;
      if (el.tagName === 'IMG') {
        const v = im[k] || orig[k];
        if (v.src && el.getAttribute('src') !== v.src) el.setAttribute('src', v.src);
        if (v.alt != null && el.alt !== v.alt) el.alt = v.alt;
      } else {
        let v = t[k] != null ? t[k] : orig[k].text;
        (data.replace || []).forEach(r => { if (r && r.find && v.trim() === r.find.trim()) v = r.replace; });
        if (el.textContent !== v && document.activeElement !== el) el.textContent = v;
        if (el.tagName === 'A') { const h = ln[k] || orig[k].href; if (h && el.getAttribute('href') !== h) el.setAttribute('href', h); }
      }
    });
    const secs = sections();
    if (secs.length) {
      const root = secs[0].parentElement;
      root.style.display = 'flex'; root.style.flexDirection = 'column';
      [...root.children].forEach((c, i) => { c.style.order = i * 10; });
      const slots = secs.map(s => +s.style.order).sort((a, b) => a - b);
      const order = (data.order || []).filter(l => secs.some(s => label(s) === l));
      const rest = secs.map(label).filter(l => !order.includes(l));
      [...order, ...rest].forEach((l, i) => { const s = secs.find(x => label(x) === l); if (s) s.style.order = slots[i]; });
      const hidden = data.hidden || [];
      secs.forEach(s => { s.style.display = hidden.includes(label(s)) ? 'none' : ''; });
    }
    const md = document.querySelector('meta[name="description"]');
    if (origTitle == null) { origTitle = document.title; origDesc = md ? md.content : ''; }
    const seo = data.seo || {};
    document.title = seo.title || origTitle;
    if (md) md.content = seo.desc || origDesc;
  }
  function set(d) { data = d || {}; window.__cmsData = data; apply(); dispatchEvent(new Event('cms-change')); }

  window.__cms = {
    page: PAGE, set, apply,
    info: () => { scan(); return { page: PAGE, title: origTitle, desc: origDesc, sections: sections().map(label), orig }; },
    scrollTo: l => { const s = sections().find(x => label(x) === l); if (s) window.scrollTo({ top: s.getBoundingClientRect().top + scrollY - 80, behavior: 'smooth' }); }
  };

  let mo, t0;
  const start = () => {
    if (!sections().length) return setTimeout(start, 120);
    apply();
    mo = new MutationObserver(() => { clearTimeout(t0); t0 = setTimeout(apply, 60); });
    mo.observe(document.body, { childList: true, subtree: true });
    if (EDIT) { editMode(); post({ type: 'ready' }); }
  };
  const post = m => { try { parent.postMessage(Object.assign({ cms: true }, m), '*'); } catch (e) {} };

  function editMode() {
    const st = document.createElement('style');
    st.textContent = '[data-reveal]{opacity:1!important;transform:none!important}[data-cms-key]{cursor:text}img[data-cms-key]{cursor:pointer}[data-cms-key]:hover{outline:1.5px dashed #EFC3C7;outline-offset:3px}[data-cms-sel]{outline:2px solid #B04A62!important;outline-offset:3px}[contenteditable]{outline:2px solid #B04A62!important;outline-offset:3px;caret-color:#B04A62}section[data-screen-label]{position:relative}';
    document.head.appendChild(st);
    const sel = el => { document.querySelectorAll('[data-cms-sel]').forEach(x => x.removeAttribute('data-cms-sel')); if (el) el.setAttribute('data-cms-sel', ''); };
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-cms-key]');
      const a = e.target.closest('a');
      if (a) e.preventDefault();
      if (!el) { sel(null); post({ type: 'deselect' }); return; }
      e.preventDefault(); e.stopPropagation();
      sel(el);
      const k = el.dataset.cmsKey, sec = k.split('#')[0];
      if (el.tagName === 'IMG') { post({ type: 'select', kind: 'img', key: k, section: sec, src: el.getAttribute('src'), alt: el.alt, w: el.naturalWidth, h: el.naturalHeight }); return; }
      el.contentEditable = 'plaintext-only';
      el.focus();
      post({ type: 'select', kind: el.tagName === 'A' ? 'link' : 'text', tag: el.tagName.toLowerCase(), key: k, section: sec, value: el.textContent, href: el.getAttribute('href') });
    }, true);
    document.addEventListener('input', e => { const el = e.target.closest('[data-cms-key]'); if (el) post({ type: 'text', key: el.dataset.cmsKey, value: el.textContent }); }, true);
    document.addEventListener('keydown', e => { const el = e.target.closest && e.target.closest('[contenteditable]'); if (el && e.key === 'Enter' && !/^P$/.test(el.tagName)) { e.preventDefault(); el.blur(); } if (el && e.key === 'Escape') el.blur(); }, true);
    document.addEventListener('focusout', e => { const el = e.target.closest && e.target.closest('[contenteditable]'); if (el) el.removeAttribute('contenteditable'); }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
