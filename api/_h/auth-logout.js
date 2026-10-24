import { json, clearSession } from '../_lib.js';
export default function handler(req, res) { clearSession(res); json(res, 200, { ok: true }); }
