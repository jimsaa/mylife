import { Router } from 'express';
import { getAllSettings, setSetting } from '../services/settingsService.js';
import { getInsightsContext, getStatsSummary, getStatsTrends } from '../services/statsService.js';

const router = Router();

router.get('/summary/:days', (req, res) => {
  const days = parseInt(req.params.days, 10);
  if (isNaN(days) || days < 1) {
    res.status(400).json({ error: 'Invalid days parameter' });
    return;
  }
  res.json(getStatsSummary(days));
});

router.get('/trends/:days', (req, res) => {
  const days = parseInt(req.params.days, 10);
  if (isNaN(days) || days < 1) {
    res.status(400).json({ error: 'Invalid days parameter' });
    return;
  }
  res.json(getStatsTrends(days));
});

router.get('/insights-context', (_req, res) => {
  res.json(getInsightsContext());
});

router.get('/settings', (_req, res) => {
  res.json(getAllSettings());
});

router.put('/settings/:key', (req, res) => {
  setSetting(req.params.key, req.body.value);
  res.json({ key: req.params.key, value: req.body.value });
});

export default router;
