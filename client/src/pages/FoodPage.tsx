import { useEffect, useState } from 'react';
import { foodApi } from '../api';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Input';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState } from '../components/ui/EmptyState';
import { MEAL_CATEGORIES } from '../lib/constants';
import { formatDate, todayIso } from '../lib/format';
import type { FoodDayData } from '../types';

export function FoodPage() {
  const [date] = useState(todayIso());
  const [data, setData] = useState<FoodDayData | null>(null);
  const [form, setForm] = useState({
    meal_category: 'breakfast' as keyof typeof MEAL_CATEGORIES,
    description: '',
    calories: '',
  });

  const load = () => foodApi.getDay(date).then(setData).catch(console.error);

  useEffect(() => {
    load();
  }, [date]);

  const save = async () => {
    if (!form.description || !form.calories) return;
    await foodApi.create({
      date,
      meal_category: form.meal_category,
      description: form.description,
      calories: parseInt(form.calories, 10),
    });
    setForm({ meal_category: form.meal_category, description: '', calories: '' });
    load();
  };

  const remove = async (id: number) => {
    await foodApi.delete(id);
    load();
  };

  if (!data) return <p className="text-text-muted">Laddar...</p>;

  return (
    <div>
      <PageHeader title="Mat" subtitle={`Medvetenhet, inte bodybuilding · ${formatDate(date)}`} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Dagens kalorier" value={`${data.total_calories} kcal`} />
        <StatCard label="Kvar idag" value={`${data.remaining} kcal`} />
        <StatCard label="Dagsmål" value={`${data.target} kcal`} />
      </div>

      <Card title="Lägg till måltid" className="mb-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Kategori">
            <Select
              value={form.meal_category}
              onChange={(e) =>
                setForm({ ...form, meal_category: e.target.value as keyof typeof MEAL_CATEGORIES })
              }
            >
              {Object.entries(MEAL_CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Beskrivning">
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Havregrynsgröt med mjölk"
            />
          </Field>
          <Field label="Kalorier">
            <Input
              type="number"
              min="0"
              value={form.calories}
              onChange={(e) => setForm({ ...form, calories: e.target.value })}
            />
          </Field>
        </div>
        <Button onClick={save} className="mt-2">
          Lägg till
        </Button>
      </Card>

      <Card title="Dagens måltider">
        {data.entries.length === 0 ? (
          <EmptyState message="Inga måltider registrerade idag." />
        ) : (
          <ul className="divide-y divide-border">
            {data.entries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium">{entry.description}</p>
                  <p className="text-text-muted">{MEAL_CATEGORIES[entry.meal_category]}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span>{entry.calories} kcal</span>
                  <Button size="sm" variant="ghost" onClick={() => remove(entry.id)}>
                    Ta bort
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
