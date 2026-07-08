import { Router } from 'express';
import { getTeslaView } from '../services/teslaViewService.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(getTeslaView());
});

export default router;
