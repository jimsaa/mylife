import { Router } from 'express';
import {
  createTimeEntry,
  deleteTimeEntry,
  getTimeEntries,
  getTimeEntriesByDate,
  getTimeEntryById,
  stopTimeEntry,
  updateTimeEntry,
} from '../services/timeEntryService.js';
import { getTimerStatus, pauseTimer, resumeTimer, startTimer, stopTimer } from '../services/timerService.js';

const router = Router();

router.get('/', (req, res) => {
  const date = req.query.date as string | undefined;
  if (date) {
    res.json(getTimeEntriesByDate(date));
    return;
  }
  res.json(getTimeEntries());
});

router.get('/timer/status', (_req, res) => {
  res.json(getTimerStatus());
});

router.post('/timer/start', (req, res) => {
  const { project_id, notes } = req.body;
  res.status(201).json(startTimer(project_id ?? null, notes));
});

router.post('/timer/pause', (_req, res) => {
  res.json(pauseTimer());
});

router.post('/timer/resume', (_req, res) => {
  res.json(resumeTimer());
});

router.post('/timer/stop', (_req, res) => {
  res.json(stopTimer());
});

router.get('/:id', (req, res) => {
  const entry = getTimeEntryById(parseInt(req.params.id, 10));
  if (!entry) {
    res.status(404).json({ error: 'Time entry not found' });
    return;
  }
  res.json(entry);
});

router.post('/', (req, res) => {
  if (!req.body.start_time) {
    res.status(400).json({ error: 'start_time is required' });
    return;
  }
  res.status(201).json(createTimeEntry({ ...req.body, is_manual: true }));
});

router.put('/:id', (req, res) => {
  const entry = updateTimeEntry(parseInt(req.params.id, 10), req.body);
  if (!entry) {
    res.status(404).json({ error: 'Time entry not found' });
    return;
  }
  res.json(entry);
});

router.post('/:id/stop', (req, res) => {
  const entry = stopTimeEntry(parseInt(req.params.id, 10), req.body.end_time);
  if (!entry) {
    res.status(404).json({ error: 'Running time entry not found' });
    return;
  }
  res.json(entry);
});

router.delete('/:id', (req, res) => {
  const ok = deleteTimeEntry(parseInt(req.params.id, 10));
  if (!ok) {
    res.status(404).json({ error: 'Time entry not found' });
    return;
  }
  res.status(204).send();
});

export default router;
