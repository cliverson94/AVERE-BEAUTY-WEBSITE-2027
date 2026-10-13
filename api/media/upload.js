import { handleUpload } from '@vercel/blob/client';
import { json, requireUser } from '../_lib.js';

export default async function handler(req, res) {
  const body = req.body || {};
  // Vercel Blob calls back when an upload finishes; that request is signed by Blob, not by a signed-in user.
  if (body.type !== 'blob.upload-completed') { const u = await requireUser(req, res); if (!u) return; }
  try {
    const result = await handleUpload({
      body, request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/webp', 'image/jpeg', 'image/png', 'image/avif', 'video/mp4', 'video/webm', 'video/quicktime'],
        maximumSizeInBytes: 60 * 1024 * 1024,
        addRandomSuffix: true
      }),
      onUploadCompleted: async () => {}
    });
    json(res, 200, result);
  } catch (e) { json(res, 400, { error: e.message }); }
}
