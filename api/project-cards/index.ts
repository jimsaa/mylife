import type { VercelRequest, VercelResponse } from '@vercel/node';
import { listCards } from '../_lib/project-cards-store';
import { methodNotAllowed } from '../_lib/vercel-http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }

  try {
    const cards = await listCards({
      activeOnly: true,
      imageBase: '/api/project-cards/image',
    });
    res.status(200).json(cards);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list project cards',
    });
  }
}
