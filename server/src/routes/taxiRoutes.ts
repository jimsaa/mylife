import { Router } from 'express';
import {
  createTaxiShift,
  deleteTaxiShift,
  getMonthlyTaxiHours,
  getTaxiShiftById,
  getTaxiShifts,
  getWeeklyTaxiHours,
  updateTaxiShift,
} from '../services/taxiService.js';
import {
  getTaxiTimerStatus,
  pauseTaxiTimer,
  resumeTaxiTimer,
  startTaxiTimer,
  stopTaxiTimer,
} from '../services/taxiTimerService.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    shifts: getTaxiShifts(),
    weekly_hours: getWeeklyTaxiHours(),
    monthly_hours: getMonthlyTaxiHours(),
  });
});

router.get('/timer/status', (_req, res) => {
  res.json(getTaxiTimerStatus());
});

router.post('/timer/start', (_req, res) => {
  try {
    startTaxiTimer();
    res.status(201).json(getTaxiTimerStatus());
  } catch (err) {
    if (err instanceof Error && err.message === 'taxi_timer_active') {
      res.status(409).json({ error: 'A taxi pass is already active' });
      return;
    }
    throw err;
  }
});

router.post('/timer/pause', (_req, res) => {
  pauseTaxiTimer();
  res.json(getTaxiTimerStatus());
});

router.post('/timer/resume', (_req, res) => {
  resumeTaxiTimer();
  res.json(getTaxiTimerStatus());
});

router.post('/timer/stop', (_req, res) => {
  const shift = stopTaxiTimer();
  res.json({ shift, timer: getTaxiTimerStatus() });
});

router.get('/:id', (req, res) => {
  const shift = getTaxiShiftById(parseInt(req.params.id, 10));
  if (!shift) {
    res.status(404).json({ error: 'Taxi shift not found' });
    return;
  }
  res.json(shift);
});

router.post('/', (req, res) => {
  if (!req.body.shift_date || req.body.hours_worked === undefined) {
    res.status(400).json({ error: 'shift_date and hours_worked are required' });
    return;
  }
  res.status(201).json(createTaxiShift(req.body));
});

router.put('/:id', (req, res) => {
  const shift = updateTaxiShift(parseInt(req.params.id, 10), req.body);
  if (!shift) {
    res.status(404).json({ error: 'Taxi shift not found' });
    return;
  }
  res.json(shift);
});

router.delete('/:id', (req, res) => {
  const ok = deleteTaxiShift(parseInt(req.params.id, 10));
  if (!ok) {
    res.status(404).json({ error: 'Taxi shift not found' });
    return;
  }
  res.status(204).send();
});

export default router;
