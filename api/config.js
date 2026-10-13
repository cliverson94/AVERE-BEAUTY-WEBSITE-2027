import { json } from './_lib.js';
export default function handler(req, res) {
  json(res, 200, { googleClientId: process.env.GOOGLE_CLIENT_ID || '', ai: !!process.env.ANTHROPIC_API_KEY });
}
