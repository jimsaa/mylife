import { Router } from 'express';
import { createGoal, deleteGoal, getGoalById, getGoals, updateGoal } from '../services/goalService.js';

const router = Router();

router.get('/', (req, res) => {
  const includeCompleted = req.query.includeCompleted === 'true';
  res.json(getGoals(includeCompleted));
});

router.get('/:id', (req, res) => {
  const goal = getGoalById(parseInt(req.params.id, 10));
  if (!goal) {
    res.status(404).json({ error: 'Goal not found' });
    return;
  }
  res.json(goal);
});

router.post('/', (req, res) => {
  if (!req.body.title?.trim()) {
    res.status(400).json({ error: 'title is required' });
    return;
  }
  res.status(201).json(createGoal(req.body));
});

router.put('/:id', (req, res) => {
  const goal = updateGoal(parseInt(req.params.id, 10), req.body);
  if (!goal) {
    res.status(404).json({ error: 'Goal not found' });
    return;
  }
  res.json(goal);
});

router.delete('/:id', (req, res) => {
  const ok = deleteGoal(parseInt(req.params.id, 10));
  if (!ok) {
    res.status(404).json({ error: 'Goal not found' });
    return;
  }
  res.status(204).send();
});

export default router;
