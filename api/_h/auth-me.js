import { json, requireUser } from '../_lib.js';
export default async function handler(req, res) {
  const u = await requireUser(req, res);
  if (u) json(res, 200, { user: u });
}
