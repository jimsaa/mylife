import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getStoredCard } from '../../../_lib/project-cards-store';
import { methodNotAllowed, requireAdmin } from '../../../_lib/vercel-http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req, res)) return;

  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }

  const id = Number(req.query.id);
  if (!Number.isFinite(id)) {
    res.status(404).end();
    return;
  }

  try {
    const card = await getStoredCard(id);
    if (!card) {
      res.status(404).end();
      return;
    }
    const buffer = Buffer.from(card.image_base64, 'base64');
    res.setHeader('Content-Type', card.mime_type);
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.status(200).send(buffer);
  } catch {
    res.status(500).end();
  }
}
