// Avere cookie consent. Ad/analytics tags load ONLY after "Accept".
// 1) Paste your IDs below. 2) Leave blank to skip a tag.
(function () {
  var META_PIXEL_ID = '';      // e.g. '1234567890'
  var GOOGLE_TAG_ID = '';      // GA4 'G-XXXX' or Google Ads 'AW-XXXX'
  var KEY = 'av_consent';      // 'granted' | 'denied'
  if (window.__avConsent) return; window.__avConsent = 1;

  // Google Consent Mode: denied until accepted
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { dataLayer.push(arguments); };
  gtag('consent', 'default', { ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });

  function loadTags() {
    if (window.__avTagsLoaded) return; window.__avTagsLoaded = 1;
    gtag('consent', 'update', { ad_storage: 'granted', analytics_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' });
    if (GOOGLE_TAG_ID) {
      var g = document.createElement('script'); g.async = true; g.src = 'https://www.googletagmanager.com/gtag/js?id=' + GOOGLE_TAG_ID; document.head.appendChild(g);
      gtag('js', new Date()); gtag('config', GOOGLE_TAG_ID);
    }
    if (META_PIXEL_ID) {
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s) }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', META_PIXEL_ID); fbq('track', 'PageView');
    }
  }

  function save(v) { try { localStorage.setItem(KEY, v); } catch (e) {} hide(); if (v === 'granted') loadTags(); }
  var el;
  function hide() { if (el) { el.remove(); el = null; } }
  function btn(label, primary, fn) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.onclick = fn;
    b.style.cssText = 'min-height:44px;padding:0 20px;border-radius:999px;font:700 14px Lato,sans-serif;cursor:pointer;' +
      (primary ? 'background:#2B2226;color:#fff;border:1px solid #2B2226' : 'background:#fff;color:#2B2226;border:1px solid #2B2226');
    return b;
  }
  function show() {
    if (el) return;
    el = document.createElement('div'); el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Cookie preferences');
    el.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:560px;margin-left:auto;background:#FFF5F5;color:#2B2226;border:1px solid #F4DADC;border-radius:24px;box-shadow:0 20px 60px rgba(43,34,38,.18);padding:20px 22px;display:flex;flex-direction:column;gap:14px;font:15px/1.55 Lato,sans-serif';
    var p = document.createElement('p'); p.style.margin = '0';
    p.innerHTML = 'We use cookies to measure our ads and improve the site. We never share your health information. <a href="/privacy-policy" style="color:#B04A62;font-weight:700">Privacy policy</a>';
    var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap';
    row.appendChild(btn('Accept', true, function () { save('granted'); }));
    row.appendChild(btn('Decline', false, function () { save('denied'); }));
    el.appendChild(p); el.appendChild(row); document.body.appendChild(el);
  }
  window.avereCookieSettings = function () { try { localStorage.removeItem(KEY); } catch (e) {} show(); };

  var v = null; try { v = localStorage.getItem(KEY); } catch (e) {}
  // Respect Global Privacy Control browser signal
  if (!v && navigator.globalPrivacyControl) v = 'denied';
  if (v === 'granted') loadTags();
  else if (!v) { if (document.body) show(); else document.addEventListener('DOMContentLoaded', show); }
})();
