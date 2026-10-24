const GH = 'https://api.github.com';
export const REPO = process.env.GITHUB_REPO || 'cliverson94/AVERE-BEAUTY-WEBSITE-2027';
export const ghReady = () => !!process.env.GITHUB_TOKEN;
export async function gh(path, opt = {}) {
  if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is not set in Vercel.');
  const r = await fetch(GH + '/repos/' + REPO + path, { ...opt, headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'content-type': 'application/json', ...(opt.headers || {}) } });
  if (r.status === 204) return null;
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error((j && j.message) || 'GitHub error ' + r.status);
  return j;
}
export const enc = p => p.split('/').map(encodeURIComponent).join('/');
export async function getFile(path, ref = 'main') {
  try { const j = await gh('/contents/' + enc(path) + '?ref=' + encodeURIComponent(ref)); return { sha: j.sha, text: Buffer.from(j.content, 'base64').toString('utf8') }; }
  catch (e) { if (/Not Found/i.test(e.message)) return null; throw e; }
}
export const putFile = (path, text, branch, sha, message) => gh('/contents/' + enc(path), { method: 'PUT', body: JSON.stringify({ message, branch, content: Buffer.from(text, 'utf8').toString('base64'), ...(sha ? { sha } : {}) }) });
export const deleteFile = (path, branch, sha, message) => gh('/contents/' + enc(path), { method: 'DELETE', body: JSON.stringify({ message, branch, sha }) });
// Login, security and server files Claude may never change.
export const PROTECTED = /^(api\/|vercel\.json$|package(-lock)?\.json$|\.|Avere Studio\.dc\.html$|Avere Page Editor\.dc\.html$|cms-live\.js$|avere-track\.js$|support\.js$)/;
export const ALLOWED_EXT = /\.(html|css|js|md|txt|xml|json)$/;
