import { Router } from 'express';
import { getDailyNote, getDailyNotes, upsertDailyNote } from '../services/journalService.js';

const router = Router();

router.get('/', (req, res) => {
  const date = req.query.date as string | undefined;
  if (date) {
    res.json(getDailyNote(date));
    return;
  }
  res.json(getDailyNotes());
});

router.put('/', (req, res) => {
  const { date, journal_text, reflection_text } = req.body;
  if (!date) {
    res.status(400).json({ error: 'date is required' });
    return;
  }
  res.json(upsertDailyNote(date, { journal_text, reflection_text }));
});

export default router;
