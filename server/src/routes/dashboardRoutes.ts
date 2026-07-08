import { Router } from 'express';
import { getDashboard } from '../services/dashboardService.js';
import { upsertDailyFocus } from '../services/dailyFocusService.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(getDashboard());
});

router.put('/focus', (req, res) => {
  const { date, focus_text } = req.body;
  if (!date || !focus_text?.trim()) {
    res.status(400).json({ error: 'date and focus_text are required' });
    return;
  }
  res.json(upsertDailyFocus(date, focus_text.trim()));
});

export default router;
