import { getDb } from '../db/connection.js';
import type { FoodEntry } from '../types/index.js';
import { getSetting } from './settingsService.js';

export function getFoodEntriesByDate(date: string): FoodEntry[] {
  return getDb()
    .prepare('SELECT * FROM food_entries WHERE date = ? ORDER BY created_at ASC')
    .all(date) as FoodEntry[];
}

export function getFoodEntriesSince(dateIso: string): FoodEntry[] {
  return getDb()
    .prepare('SELECT * FROM food_entries WHERE date >= ? ORDER BY date ASC, created_at ASC')
    .all(dateIso) as FoodEntry[];
}

export function createFoodEntry(data: {
  date: string;
  meal_category: FoodEntry['meal_category'];
  description: string;
  calories: number;
}): FoodEntry {
  const result = getDb()
    .prepare(
      `INSERT INTO food_entries (date, meal_category, description, calories)
       VALUES (@date, @meal_category, @description, @calories)`
    )
    .run(data);
  return getDb().prepare('SELECT * FROM food_entries WHERE id = ?').get(result.lastInsertRowid) as FoodEntry;
}

export function deleteFoodEntry(id: number): boolean {
  const result = getDb().prepare('DELETE FROM food_entries WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getDailyCalories(date: string): number {
  const row = getDb()
    .prepare(`SELECT COALESCE(SUM(calories), 0) as total FROM food_entries WHERE date = ?`)
    .get(date) as { total: number };
  return row.total;
}

export function getCalorieTarget(): number {
  const raw = getSetting('calorie_target');
  return raw ? parseInt(raw, 10) : 2500;
}

export function getAverageCaloriesSince(dateIso: string): number | null {
  const row = getDb()
    .prepare(
      `SELECT AVG(daily_total) as avg FROM (
         SELECT date, SUM(calories) as daily_total FROM food_entries
         WHERE date >= ? GROUP BY date
       )`
    )
    .get(dateIso) as { avg: number | null };
  return row.avg !== null ? Math.round(row.avg) : null;
}

export function getCalorieTrendSince(dateIso: string): { date: string; value: number }[] {
  return getDb()
    .prepare(
      `SELECT date, SUM(calories) as value FROM food_entries
       WHERE date >= ? GROUP BY date ORDER BY date ASC`
    )
    .all(dateIso) as { date: string; value: number }[];
}

export function getWeeklyCalorieAverage(): number | null {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return getAverageCaloriesSince(sevenDaysAgo.toISOString().slice(0, 10));
}
