import { Router } from 'express';
import type { DailySleepCheckin } from '../types/index.js';
import {
  createDailySleepCheckin,
  getDailySleepCheckinByDate,
  listDailySleepCheckins,
  updateDailySleepCheckin,
  upsertDailySleepCheckin,
} from '../services/dailySleepCheckinService.js';
import { todayIso } from '../services/utils.js';

const router = Router();

function parseBody(body: Record<string, unknown>) {
  return {
    date: typeof body.date === 'string' ? body.date : undefined,
    sleep_score: Number(body.sleep_score),
    actual_sleep_minutes: Number(body.actual_sleep_minutes),
    deep_sleep_minutes: Number(body.deep_sleep_minutes),
    rem_sleep_minutes: Number(body.rem_sleep_minutes),
    morning_energy: Number(body.morning_energy),
  };
}

router.get('/', (req, res) => {
  const date = req.query.date as string | undefined;
  if (date) {
    res.json(getDailySleepCheckinByDate(date));
    return;
  }
  res.json(listDailySleepCheckins());
});

router.get('/today', (_req, res) => {
  res.json(getDailySleepCheckinByDate(todayIso()));
});

router.post('/', (req, res) => {
  const payload = parseBody(req.body);
  if (
    Number.isNaN(payload.sleep_score) ||
    Number.isNaN(payload.actual_sleep_minutes) ||
    Number.isNaN(payload.deep_sleep_minutes) ||
    Number.isNaN(payload.rem_sleep_minutes) ||
    Number.isNaN(payload.morning_energy)
  ) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  try {
    const result = createDailySleepCheckin(payload);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof Error && err.message === 'duplicate') {
      const existing = (err as Error & { existing: DailySleepCheckin }).existing;
      res.status(409).json({
        error: 'duplicate',
        message: 'Du har redan registrerat sömn för idag. Vill du uppdatera den?',
        existing,
      });
      return;
    }
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
});

router.put('/upsert', (req, res) => {
  const payload = parseBody(req.body);
  if (
    Number.isNaN(payload.sleep_score) ||
    Number.isNaN(payload.actual_sleep_minutes) ||
    Number.isNaN(payload.deep_sleep_minutes) ||
    Number.isNaN(payload.rem_sleep_minutes) ||
    Number.isNaN(payload.morning_energy)
  ) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  try {
    res.json(upsertDailySleepCheckin(payload));
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
});

router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  const payload = parseBody(req.body);
  if (
    Number.isNaN(payload.sleep_score) ||
    Number.isNaN(payload.actual_sleep_minutes) ||
    Number.isNaN(payload.deep_sleep_minutes) ||
    Number.isNaN(payload.rem_sleep_minutes) ||
    Number.isNaN(payload.morning_energy)
  ) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  try {
    const result = updateDailySleepCheckin(id, payload);
    res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === 'not_found') {
      res.status(404).json({ error: 'Check-in not found' });
      return;
    }
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
});

export default router;
