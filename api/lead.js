import crypto from 'node:crypto';
import { json, redis, redisPipe } from './_lib.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const FORMS = { elevens: "11's Day waitlist", newpatient: 'New client offer', consult: 'Free consultation', bridal: 'Bridal', vip: 'VIP waitlist', refer: 'Referral', lhr: 'Laser hair removal quote', training: 'Injector training', weightloss: 'Weight loss consult', quickbook: 'Quick Book request', sweeps: '$100 gift card giveaway', gloss: 'Lip gloss offer ($500 spend)', quiz: 'Quiz result' };
const LABEL = k => ({ first_name: 'First name', last_name: 'Last name', phone: 'Phone', email: 'Email', interest: 'Interested in', location: 'Office', best_time: 'Best time', question: 'Question', preferred_day: 'Preferred day', preferred_time: 'Preferred time', new_client: 'New client', sms_consent: 'OK to text', marketing_consent: 'OK to email offers', page: 'Page', utm_source: 'Source', utm_campaign: 'Campaign', referrer: 'Came from' }[k] || k.replace(/_/g, ' '));
const SKIP = new Set(['form_id', 'submitted_at', 'first_touch', 'company_website']);

async function resend(payload) {
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  if (!r.ok) throw new Error('Resend ' + r.status + ' ' + (await r.text()).slice(0, 200));
}
async function sms(to, body) {
  const sid = process.env.TWILIO_ACCOUNT_SID, tok = process.env.TWILIO_AUTH_TOKEN;
  const r = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + sid + '/Messages.json', { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(sid + ':' + tok).toString('base64'), 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ To: to, From: process.env.TWILIO_FROM, Body: body }) });
  if (!r.ok) throw new Error('Twilio ' + r.status);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } } b = b || {};
  if (b.company_website) return json(res, 200, { ok: true });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  try {
    const n = await redis('INCR', 'st:lr:' + ip); if (n === 1) await redis('EXPIRE', 'st:lr:' + ip, 3600);
    if (n > 15) return json(res, 429, { error: 'Too many requests. Please call 412-952-7592.' });
  } catch (e) {}
  const phone = String(b.phone || '').replace(/\D/g, '').slice(-10);
  const name = String(b.first_name || b.name || '').trim().slice(0, 80);
  if (!name || phone.length < 10) return json(res, 400, { error: 'Please add your name and a 10-digit phone number.' });
  const fields = {};
  for (const [k, v] of Object.entries(b)) { if (SKIP.has(k) || v === '' || v == null) continue; fields[k.slice(0, 40)] = typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v).slice(0, 600); }
  fields.phone = '(' + phone.slice(0, 3) + ') ' + phone.slice(3, 6) + '-' + phone.slice(6);
  const lead = { id: crypto.randomUUID(), at: new Date().toISOString(), form_id: String(b.form_id || 'form').slice(0, 30), form: FORMS[b.form_id] || String(b.form_id || 'Website form'), name: (name + ' ' + (b.last_name || '')).trim(), phone: fields.phone, email: fields.email || '', interest: fields.interest || '', office: fields.location || '', fields, status: 'New', notified: {} };

  const to = (process.env.LEADS_TO || 'info@averebeauty.com').split(',').map(s => s.trim()).filter(Boolean);
  const from = process.env.LEADS_FROM || 'Avere Beauty <leads@averebeauty.com>';
  const studio = (process.env.STUDIO_URL || ('https://' + req.headers.host)) + '/studio';
  const rows = Object.entries(fields).map(([k, v]) => '<tr><td style="padding:6px 12px 6px 0;color:#6E5F64;vertical-align:top">' + esc(LABEL(k)) + '</td><td style="padding:6px 0;color:#2B2226">' + esc(v) + '</td></tr>').join('');
  const jobs = [];
  if (process.env.RESEND_API_KEY) {
    jobs.push(['office', resend({ from, to, reply_to: lead.email || undefined, subject: 'New lead: ' + lead.form + ' · ' + lead.name + (lead.office ? ' · ' + lead.office : ''),
      html: '<div style="font-family:Arial,sans-serif;font-size:15px"><h2 style="font-weight:400;margin:0 0 12px">' + esc(lead.form) + '</h2><table style="border-collapse:collapse">' + rows + '</table><p style="margin-top:16px"><a href="tel:+1' + phone + '">Call ' + esc(lead.phone) + '</a> · <a href="' + esc(studio) + '">Open Studio</a></p></div>' })]);
    if (lead.email) jobs.push(['client', resend({ from, to: [lead.email], reply_to: to[0], subject: 'We got your request · Avere Beauty',
      html: '<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#2B2226;max-width:520px"><p>Hi ' + esc(name) + ',</p><p>Thanks for reaching out to Avere Beauty. We received your ' + esc(lead.form.toLowerCase()) + ' request' + (lead.interest ? ' for <strong>' + esc(lead.interest) + '</strong>' : '') + ' and a team member will contact you shortly.</p><p>Need us sooner? Call or text <a href="tel:+14129527592">412-952-7592</a>.</p><p>Avere Beauty</p></div>' })]);
  }
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_FROM && process.env.LEADS_SMS_TO) {
    const body = 'New ' + lead.form + ': ' + lead.name + ', ' + lead.phone + (lead.interest ? ', ' + lead.interest : '') + (lead.office ? ' @ ' + lead.office : '') + '. ' + studio;
    for (const n of process.env.LEADS_SMS_TO.split(',').map(s => s.trim()).filter(Boolean)) jobs.push(['sms ' + n, sms(n, body.slice(0, 300))]);
  }
  if (process.env.LIPS_WEBHOOK_URL) {
    const headers = { 'content-type': 'application/json' };
    if (process.env.LIPS_API_KEY) headers[process.env.LIPS_API_HEADER || 'Authorization'] = (process.env.LIPS_API_HEADER ? '' : 'Bearer ') + process.env.LIPS_API_KEY;
    jobs.push(['LIPS', fetch(process.env.LIPS_WEBHOOK_URL, { method: 'POST', headers, body: JSON.stringify({ source: 'avere-website', id: lead.id, created_at: lead.at, form: lead.form, form_id: lead.form_id, name: lead.name, first_name: name, last_name: b.last_name || '', phone: '+1' + phone, email: lead.email, interest: lead.interest, office: lead.office, fields }) }).then(r => { if (!r.ok) throw new Error('LIPS ' + r.status); })]);
  }
  if (process.env.SHEETS_WEBHOOK_URL && (!process.env.SHEETS_FORMS || process.env.SHEETS_FORMS.split(',').includes(lead.form_id))) {
    jobs.push(['Sheets', fetch(process.env.SHEETS_WEBHOOK_URL, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify({ secret: process.env.SHEETS_SECRET || '', created_at: lead.at, form: lead.form, form_id: lead.form_id, name: lead.name, phone: lead.phone, email: lead.email, interest: lead.interest, office: lead.office, notes: fields.notes || '', year: new Date().getFullYear() }), redirect: 'follow' }).then(r => { if (!r.ok) throw new Error('Sheets ' + r.status); })]);
  }
  const results = await Promise.allSettled(jobs.map(j => j[1]));
  results.forEach((r, i) => { lead.notified[jobs[i][0]] = r.status === 'fulfilled' ? 'sent' : String(r.reason && r.reason.message || 'failed').slice(0, 160); });
  try { await redisPipe([['HSET', 'studio:leads', lead.id, JSON.stringify(lead)], ['ZADD', 'studio:leads:idx', Date.now(), lead.id]]); } catch (e) {}
  json(res, 200, { ok: true });
}
