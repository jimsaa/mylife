import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseText } from '../_lib/taxi-log-store';
import { methodNotAllowed, readJsonBody, requireAdmin } from '../_lib/vercel-http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  try {
    const body = readJsonBody<{ text?: string }>(req);
    res.status(200).json(await parseText(String(body.text ?? '')));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    res.status(400).json({ error: message });
  }
}
