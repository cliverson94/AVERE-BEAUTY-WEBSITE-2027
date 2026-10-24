import crypto from 'node:crypto';
import { json, redis, requireUser } from '../_lib.js';
import { gh, getFile, ghReady, PROTECTED, ALLOWED_EXT } from '../_gh.js';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';
const PRICE_IN = Number(process.env.AI_PRICE_IN || 3) / 1e6, PRICE_OUT = Number(process.env.AI_PRICE_OUT || 15) / 1e6;
const CAP = Number(process.env.AI_MONTHLY_CAP_USD || 20);
const month = () => new Date().toISOString().slice(0, 7);

const SYSTEM = `You are Claude, built into Avere Studio, the back end of the Avere Beauty website (a medical spa with offices in Lawrenceville, Murrysville, Cranberry and Blawnox/Fox Chapel, Pittsburgh). You help the owners fix and improve the site.

How the site is built:
- Each page is one file like "Avere Tattoo Removal.dc.html". Markup sits between <x-dc> and </x-dc> with inline styles only. Logic lives in a <script type="text/x-dc" data-dc-script> class. {{ name }} holes are filled from renderVals().
- Shared pieces: "Avere Nav.dc.html", "Avere Footer.dc.html", "Avere Book Bar.dc.html", "Avere Lead Form.dc.html".
- Brand: Poppins headings (weight 400), Lato body. Colors: ink #2B2226, rose #B04A62, blush #F4DADC, light #EFC3C7, background #FFF5F5. Generous whitespace.
- Pages "home" and "tattoo-removal" also have editable content stored in Studio (read_content).

Two kinds of changes:
1. propose_content_edit: swap visible text or the SEO title/description on a page with Studio content (home, tattoo-removal). Each "find" must be the exact current visible text of one element (a heading, paragraph, button). Safest option; prefer it when it can do the job.
2. propose_code_change: edit page files. Always read_file first. Each edit is an exact find/replace where "find" appears exactly once in the file; keep it short but unique. Change only what was asked; keep inline-style conventions. New files: give full content.

Rules: Never touch login, security or server files (api/, vercel.json, package.json, Studio, Page Editor, cms-live.js, avere-track.js, support.js). Never write medical guarantees ("guaranteed", "permanent", "pain-free", "no risk"). Don't invent prices, results or credentials; ask instead. Voice: warm, plain, confident, no hype, no exclamation marks.
Nothing goes live from you: the owner previews and approves every proposal. Keep replies short and plain: what you found, what you propose.`;

const TOOLS = [
  { name: 'list_pages', description: 'List website pages with their URL and file name.', input_schema: { type: 'object', properties: {} } },
  { name: 'read_file', description: 'Read a file from the live site (main branch). Long files are truncated.', input_schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
  { name: 'read_content', description: 'Read Studio-managed content for a page (home or tattoo-removal): text overrides, SEO, FAQs.', input_schema: { type: 'object', properties: { page_id: { type: 'string' } }, required: ['page_id'] } },
  { name: 'propose_content_edit', description: 'Propose text and/or SEO changes for a Studio-managed page. Not applied until the owner approves.', input_schema: { type: 'object', properties: { page_id: { type: 'string' }, summary: { type: 'string' }, edits: { type: 'array', items: { type: 'object', properties: { find: { type: 'string' }, replace: { type: 'string' } }, required: ['find', 'replace'] } }, seo: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' } } } }, required: ['page_id', 'summary'] } },
  { name: 'propose_code_change', description: 'Propose edits to site files. Goes to a private test link first; the owner approves before it goes live.', input_schema: { type: 'object', properties: { summary: { type: 'string' }, files: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, edits: { type: 'array', items: { type: 'object', properties: { find: { type: 'string' }, replace: { type: 'string' } }, required: ['find', 'replace'] } }, new_content: { type: 'string' } }, required: ['path'] } } }, required: ['summary', 'files'] } }
];

async function runTool(name, input, ctx) {
  if (name === 'list_pages') {
    const v = await getFile('vercel.json');
    const rw = v ? JSON.parse(v.text).rewrites || [] : [];
    return rw.filter(r => !r.has).map(r => r.source + ' → ' + decodeURIComponent(r.destination.slice(1))).join('\n');
  }
  if (name === 'read_file') {
    const f = await getFile(String(input.path || ''));
    if (!f) return 'File not found: ' + input.path;
    return f.text.length > 60000 ? f.text.slice(0, 60000) + '\n…[truncated]' : f.text;
  }
  if (name === 'read_content') {
    const raw = await redis('HGET', 'studio:content', String(input.page_id || ''));
    if (!raw) return 'No Studio content saved for this page yet (the page shows its built-in text).';
    const r = JSON.parse(raw); return JSON.stringify({ live: r.live || {}, draft: r.draft || {} }).slice(0, 20000);
  }
  if (name === 'propose_content_edit') {
    const p = { id: crypto.randomUUID().slice(0, 8), type: 'content', status: 'proposed', page: input.page_id, summary: input.summary, edits: (input.edits || []).slice(0, 40), seo: input.seo || null, at: new Date().toISOString(), by: ctx.user };
    ctx.proposals.push(p); return 'Proposal ' + p.id + ' recorded. The owner will review it.';
  }
  if (name === 'propose_code_change') {
    const files = (input.files || []).slice(0, 8);
    for (const f of files) {
      if (PROTECTED.test(f.path)) return 'Refused: ' + f.path + ' is a protected login/security/server file.';
      if (!ALLOWED_EXT.test(f.path)) return 'Refused: unsupported file type ' + f.path;
      if (!f.new_content) {
        const cur = await getFile(f.path);
        if (!cur) return 'File not found: ' + f.path + '. Use new_content to create it.';
        for (const e of f.edits || []) { const n = cur.text.split(e.find).length - 1; if (n !== 1) return 'In ' + f.path + ', this "find" text appears ' + n + ' times (must be exactly once): ' + e.find.slice(0, 120); }
      }
    }
    const p = { id: crypto.randomUUID().slice(0, 8), type: 'code', status: 'proposed', summary: input.summary, files, at: new Date().toISOString(), by: ctx.user };
    ctx.proposals.push(p); return 'Proposal ' + p.id + ' recorded. The owner will create a test link and approve.';
  }
  return 'Unknown tool';
}

export default async function handler(req, res) {
  const u = await requireUser(req, res, ['owner']); if (!u) return;
  if (!process.env.ANTHROPIC_API_KEY) return json(res, 501, { error: 'Add ANTHROPIC_API_KEY in Vercel to turn on Claude.' });
  try {
    const costKey = 'ai:cost:' + month();
    const spent = Number(await redis('GET', costKey)) || 0;
    if (spent / 1e6 >= CAP) return json(res, 402, { error: 'Monthly AI limit of $' + CAP + ' reached. It resets on the 1st.' });
    const history = ((req.body || {}).messages || []).slice(-16).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 8000) })).filter(m => m.content);
    if (!history.length || history[history.length - 1].role !== 'user') return json(res, 400, { error: 'Say something first.' });
    const ctx = { proposals: [], user: u.email };
    const knowledge = String((await redis('GET', 'studio:ai:knowledge')) || '').slice(0, 30000);
    const tools = ghReady() ? TOOLS : TOOLS.filter(t => !['list_pages', 'read_file', 'propose_code_change'].includes(t.name));
    let messages = history, text = '', usd = 0;
    for (let turn = 0; turn < 8; turn++) {
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model: MODEL, max_tokens: 4000, system: SYSTEM + (knowledge ? '\n\nAvere company knowledge (written by the owners; treat as the source of truth):\n' + knowledge : '') + (ghReady() ? '' : '\n\nCode changes are off (no GITHUB_TOKEN). Only content edits are possible.'), tools, messages }) });
      const j = await r.json();
      if (!r.ok) throw new Error((j.error && j.error.message) || 'Claude request failed');
      usd += (j.usage.input_tokens || 0) * PRICE_IN + (j.usage.output_tokens || 0) * PRICE_OUT;
      text = j.content.filter(c => c.type === 'text').map(c => c.text).join('\n').trim() || text;
      if (j.stop_reason !== 'tool_use') break;
      const results = [];
      for (const c of j.content.filter(c => c.type === 'tool_use')) {
        let out; try { out = await runTool(c.name, c.input || {}, ctx); } catch (e) { out = 'Error: ' + e.message; }
        results.push({ type: 'tool_result', tool_use_id: c.id, content: String(out) });
      }
      messages = [...messages, { role: 'assistant', content: j.content }, { role: 'user', content: results }];
    }
    await redis('INCRBY', costKey, Math.round(usd * 1e6)); await redis('EXPIRE', costKey, 60 * 60 * 24 * 70);
    for (const p of ctx.proposals) { await redis('HSET', 'studio:ai', p.id, JSON.stringify(p)); await redis('ZADD', 'studio:ai:idx', Date.now(), p.id); }
    json(res, 200, { reply: text, proposals: ctx.proposals, spent: (spent / 1e6) + usd, cap: CAP });
  } catch (e) { json(res, 500, { error: e.message }); }
}
