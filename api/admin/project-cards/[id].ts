import type { VercelRequest, VercelResponse } from '@vercel/node';
import { deleteCard, updateCard } from '../../_lib/project-cards-store';
import {
  methodNotAllowed,
  readJsonBody,
  requireAdmin,
} from '../../_lib/vercel-http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req, res)) return;

  const id = Number(req.query.id);
  if (!Number.isFinite(id)) {
    res.status(404).json({ error: 'Project card not found' });
    return;
  }

  try {
    if (req.method === 'PUT') {
      const body = readJsonBody<{
        title?: string;
        description?: string | null;
        url?: string;
        active?: boolean;
        sort_order?: number;
        image_base64?: string;
        mime_type?: string;
      }>(req);
      const card = await updateCard(id, body);
      if (!card) {
        res.status(404).json({ error: 'Project card not found' });
        return;
      }
      res.status(200).json(card);
      return;
    }

    if (req.method === 'DELETE') {
      const ok = await deleteCard(id);
      if (!ok) {
        res.status(404).json({ error: 'Project card not found' });
        return;
      }
      res.status(204).end();
      return;
    }

    methodNotAllowed(res, ['PUT', 'DELETE']);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    const status = message.includes('not configured') ? 503 : 400;
    res.status(status).json({ error: message });
  }
}
