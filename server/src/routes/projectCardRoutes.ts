import { Router } from 'express';
import {
  createProjectCard,
  deleteProjectCard,
  getProjectCardById,
  listAllProjectCards,
  listPublicProjectCards,
  updateProjectCard,
} from '../services/projectCardService.js';
import { resolveProjectCardImageAbsolute } from '../services/projectCardImageService.js';

function sendCardImage(
  res: { status: (n: number) => { end: () => void }; sendFile: (p: string) => void },
  id: number,
  requireActive: boolean,
): void {
  const card = getProjectCardById(id);
  if (!card || (requireActive && card.active !== 1)) {
    res.status(404).end();
    return;
  }
  const absolute = resolveProjectCardImageAbsolute(card.image_path);
  if (!absolute) {
    res.status(404).end();
    return;
  }
  res.sendFile(absolute);
}

/** Public: active cards only (mounted before requireAdminAuth). */
export const projectCardsPublicRouter = Router();

projectCardsPublicRouter.get('/', (_req, res) => {
  res.json(listPublicProjectCards());
});

projectCardsPublicRouter.get('/image/:id', (req, res) => {
  sendCardImage(res, parseInt(req.params.id, 10), true);
});

/** Admin CRUD (mounted behind requireAdminAuth). */
const router = Router();

router.get('/', (_req, res) => {
  res.json(listAllProjectCards());
});

router.get('/image/:id', (req, res) => {
  sendCardImage(res, parseInt(req.params.id, 10), false);
});

router.get('/:id', (req, res) => {
  const card = getProjectCardById(parseInt(req.params.id, 10));
  if (!card) {
    res.status(404).json({ error: 'Project card not found' });
    return;
  }
  res.json(card);
});

router.post('/', (req, res) => {
  try {
    const card = createProjectCard(req.body ?? {});
    res.status(201).json(card);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Create failed',
    });
  }
});

router.put('/:id', (req, res) => {
  try {
    const card = updateProjectCard(parseInt(req.params.id, 10), req.body ?? {});
    if (!card) {
      res.status(404).json({ error: 'Project card not found' });
      return;
    }
    res.json(card);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Update failed',
    });
  }
});

router.delete('/:id', (req, res) => {
  const ok = deleteProjectCard(parseInt(req.params.id, 10));
  if (!ok) {
    res.status(404).json({ error: 'Project card not found' });
    return;
  }
  res.status(204).send();
});

export default router;
