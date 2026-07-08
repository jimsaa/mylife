import { Router } from 'express';
import {
  createSleepLog,
  deleteSleepLog,
  getSleepLogById,
  getSleepLogs,
  updateSleepLog,
} from '../services/sleepService.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(getSleepLogs());
});

router.get('/:id', (req, res) => {
  const log = getSleepLogById(parseInt(req.params.id, 10));
  if (!log) {
    res.status(404).json({ error: 'Sleep log not found' });
    return;
  }
  res.json(log);
});

router.post('/', (req, res) => {
  if (!req.body.sleep_date || req.body.hours_slept === undefined) {
    res.status(400).json({ error: 'sleep_date and hours_slept are required' });
    return;
  }
  res.status(201).json(createSleepLog(req.body));
});

router.put('/:id', (req, res) => {
  const log = updateSleepLog(parseInt(req.params.id, 10), req.body);
  if (!log) {
    res.status(404).json({ error: 'Sleep log not found' });
    return;
  }
  res.json(log);
});

router.delete('/:id', (req, res) => {
  const ok = deleteSleepLog(parseInt(req.params.id, 10));
  if (!ok) {
    res.status(404).json({ error: 'Sleep log not found' });
    return;
  }
  res.status(204).send();
});

export default router;
