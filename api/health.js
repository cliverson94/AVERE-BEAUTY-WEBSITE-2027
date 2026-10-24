import { redis, owners } from './_lib.js';
// Setup check for the Studio sign-in page. Reports which settings exist, never their values.
export default async function handler(req, res) {
  let db = 'missing';
  if (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) { try { await redis('PING'); db = 'ok'; } catch (e) { db = 'error'; } }
  res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify({
    api: true,
    logins: owners().length, sharedPassword: !!process.env.STUDIO_PASSWORD, loginsVar: !!process.env.STUDIO_LOGINS,
    sessionSecret: !!process.env.SESSION_SECRET, database: db,
    blob: !!process.env.BLOB_READ_WRITE_TOKEN, claude: !!process.env.ANTHROPIC_API_KEY, email: !!process.env.RESEND_API_KEY
  }));
}
