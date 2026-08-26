import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createCard, listCards } from '../../_lib/project-cards-store';
import {
  methodNotAllowed,
  readJsonBody,
  requireAdmin,
} from '../../_lib/vercel-http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req, res)) return;

  try {
    if (req.method === 'GET') {
      const cards = await listCards({
        activeOnly: false,
        imageBase: '/api/admin/project-cards/image',
      });
      res.status(200).json(cards);
      return;
    }

    if (req.method === 'POST') {
      const body = readJsonBody<{
        title: string;
        description?: string | null;
        url: string;
        active?: boolean;
        sort_order?: number;
        image_base64: string;
        mime_type: string;
      }>(req);
      const card = await createCard(body);
      res.status(201).json(card);
      return;
    }

    methodNotAllowed(res, ['GET', 'POST']);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    const status = message.includes('not configured') ? 503 : 400;
    res.status(status).json({ error: message });
  }
}
