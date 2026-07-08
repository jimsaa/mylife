import { Router } from 'express';
import { getDailyWellbeing, getWellbeingHistory, upsertDailyWellbeing } from '../services/wellbeingService.js';

const router = Router();

router.get('/', (req, res) => {
  const date = req.query.date as string | undefined;
  if (date) {
    res.json(getDailyWellbeing(date));
    return;
  }
  res.json(getWellbeingHistory());
});

router.put('/', (req, res) => {
  const { date, energy_level, mood_level, stress_level, notes } = req.body;
  if (!date) {
    res.status(400).json({ error: 'date is required' });
    return;
  }
  res.json(upsertDailyWellbeing(date, { energy_level, mood_level, stress_level, notes }));
});

export default router;
