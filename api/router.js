// One function for all Studio/admin endpoints (keeps the Vercel Hobby plan under its 12-function limit).
import h_ai_alt from './_h/ai-alt.js';
import h_ai_changes from './_h/ai-changes.js';
import h_ai_chat from './_h/ai-chat.js';
import h_ai_knowledge from './_h/ai-knowledge.js';
import h_auth_google from './_h/auth-google.js';
import h_auth_login from './_h/auth-login.js';
import h_auth_logout from './_h/auth-logout.js';
import h_auth_me from './_h/auth-me.js';
import h_config from './_h/config.js';
import h_content from './_h/content.js';
import h_health from './_h/health.js';
import h_leads from './_h/leads.js';
import h_media_index from './_h/media-index.js';
import h_media_upload from './_h/media-upload.js';
import h_popups from './_h/popups.js';
import h_seo from './_h/seo.js';
import h_stats from './_h/stats.js';
import h_users from './_h/users.js';
const ROUTES = {
  'ai/alt': h_ai_alt,
  'ai/changes': h_ai_changes,
  'ai/chat': h_ai_chat,
  'ai/knowledge': h_ai_knowledge,
  'auth/google': h_auth_google,
  'auth/login': h_auth_login,
  'auth/logout': h_auth_logout,
  'auth/me': h_auth_me,
  'config': h_config,
  'content': h_content,
  'health': h_health,
  'leads': h_leads,
  'media/index': h_media_index,
  'media': h_media_index,
  'media/upload': h_media_upload,
  'popups': h_popups,
  'seo': h_seo,
  'stats': h_stats,
  'users': h_users,
};
export default async function handler(req, res) {
  const q = req.query || {};
  let p = q.__p; if (Array.isArray(p)) p = p.join('/');
  p = String(p || '').replace(/^\/+|\/+$/g, '');
  delete q.__p;
  const h = ROUTES[p];
  if (!h) { res.statusCode = 404; res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify({ error: 'Not found' })); }
  return h(req, res);
}
