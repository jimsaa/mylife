import { Router } from 'express';
import {
  createFoodEntry,
  deleteFoodEntry,
  getDailyCalories,
  getFoodEntriesByDate,
  getFoodEntriesSince,
  getWeeklyCalorieAverage,
  getCalorieTarget,
} from '../services/foodService.js';

const router = Router();

router.get('/', (req, res) => {
  const date = req.query.date as string | undefined;
  const since = req.query.since as string | undefined;
  if (date) {
    res.json({
      entries: getFoodEntriesByDate(date),
      total_calories: getDailyCalories(date),
      target: getCalorieTarget(),
      remaining: getCalorieTarget() - getDailyCalories(date),
    });
    return;
  }
  if (since) {
    res.json(getFoodEntriesSince(since));
    return;
  }
  res.json({ weekly_average: getWeeklyCalorieAverage(), target: getCalorieTarget() });
});

router.post('/', (req, res) => {
  const { date, meal_category, description, calories } = req.body;
  if (!date || !meal_category || !description || calories === undefined) {
    res.status(400).json({ error: 'date, meal_category, description, and calories are required' });
    return;
  }
  res.status(201).json(createFoodEntry(req.body));
});

router.delete('/:id', (req, res) => {
  const ok = deleteFoodEntry(parseInt(req.params.id, 10));
  if (!ok) {
    res.status(404).json({ error: 'Food entry not found' });
    return;
  }
  res.status(204).send();
});

export default router;
