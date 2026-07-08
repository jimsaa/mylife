import { Router } from 'express';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEventById,
  getCalendarEvents,
  updateCalendarEvent,
} from '../services/calendarService.js';

const router = Router();

router.get('/', (req, res) => {
  const start = req.query.start as string | undefined;
  const end = req.query.end as string | undefined;
  res.json(getCalendarEvents(start, end));
});

router.get('/:id', (req, res) => {
  const event = getCalendarEventById(parseInt(req.params.id, 10));
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  res.json(event);
});

router.post('/', (req, res) => {
  if (!req.body.title || !req.body.start_time || !req.body.end_time) {
    res.status(400).json({ error: 'title, start_time, and end_time are required' });
    return;
  }
  res.status(201).json(createCalendarEvent(req.body));
});

router.put('/:id', (req, res) => {
  const event = updateCalendarEvent(parseInt(req.params.id, 10), req.body);
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  res.json(event);
});

router.delete('/:id', (req, res) => {
  const ok = deleteCalendarEvent(parseInt(req.params.id, 10));
  if (!ok) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  res.status(204).send();
});

export default router;
