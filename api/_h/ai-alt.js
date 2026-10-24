import { json, requireUser } from '../_lib.js';
export default async function handler(req, res) {
  const u = await requireUser(req, res);
  if (!u) return;
  if (!process.env.ANTHROPIC_API_KEY) return json(res, 501, { error: 'AI alt text is off. Add ANTHROPIC_API_KEY in Vercel to turn it on.' });
  const { url, labels = {} } = req.body || {};
  const context = Object.entries(labels).filter(([, v]) => v).map(([k, v]) => k + ': ' + v).join(', ');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5', max_tokens: 120,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'url', url } },
        { type: 'text', text: 'Write alt text for this photo on the website of Avere Beauty, a medical spa in Pittsburgh. Under 120 characters. Describe what is visible; include the treatment and office if relevant. No "image of". No medical claims. Known labels: ' + (context || 'none') + '. Return only the alt text.' }
      ] }]
    })
  });
  const j = await r.json();
  if (!r.ok) return json(res, 502, { error: (j.error && j.error.message) || 'AI request failed' });
  json(res, 200, { alt: (j.content && j.content[0] && j.content[0].text || '').trim().replace(/^"|"$/g, '') });
}
