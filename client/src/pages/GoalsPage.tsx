import { useEffect, useState } from 'react';
import { goalApi } from '../api';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input, Select, Textarea } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { GOAL_STATUS_LABELS } from '../lib/constants';
import { formatDate } from '../lib/format';
import type { Goal } from '../types';

export function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [editing, setEditing] = useState<Partial<Goal> | null>(null);

  const load = () => goalApi.list(true).then(setGoals).catch(console.error);

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!editing?.title) return;
    if (editing.id) {
      await goalApi.update(editing.id, editing);
    } else {
      await goalApi.create(editing);
    }
    setEditing(null);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Mål"
        subtitle="Långsiktig riktning för livet"
        action={
          <Button onClick={() => setEditing({ title: '', progress_percent: 0, status: 'active' })}>
            Nytt mål
          </Button>
        }
      />

      {goals.length === 0 ? (
        <EmptyState message="Inga mål definierade ännu." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((goal) => (
            <Card key={goal.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{goal.title}</h3>
                  <p className="text-xs text-text-muted">
                    {GOAL_STATUS_LABELS[goal.status]}
                    {goal.category && ` · ${goal.category}`}
                  </p>
                </div>
                <span className="text-lg font-bold text-accent">{goal.progress_percent}%</span>
              </div>
              {goal.description && (
                <p className="mt-2 text-sm text-text-muted">{goal.description}</p>
              )}
              {(goal.start_date || goal.target_date) && (
                <p className="mt-2 text-xs text-text-muted">
                  {goal.start_date && formatDate(goal.start_date)}
                  {goal.target_date && ` → ${formatDate(goal.target_date)}`}
                </p>
              )}
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${goal.progress_percent}%` }}
                />
              </div>
              <Button size="sm" variant="secondary" className="mt-3" onClick={() => setEditing(goal)}>
                Redigera
              </Button>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg" title={editing.id ? 'Redigera mål' : 'Nytt mål'}>
            <Field label="Titel">
              <Input
                value={editing.title ?? ''}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </Field>
            <Field label="Beskrivning">
              <Textarea
                value={editing.description ?? ''}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </Field>
            <Field label="Kategori">
              <Input
                value={editing.category ?? ''}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                placeholder="Arbete, hälsa, familj..."
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Startdatum">
                <Input
                  type="date"
                  value={editing.start_date ?? ''}
                  onChange={(e) => setEditing({ ...editing, start_date: e.target.value })}
                />
              </Field>
              <Field label="Måldatum">
                <Input
                  type="date"
                  value={editing.target_date ?? ''}
                  onChange={(e) => setEditing({ ...editing, target_date: e.target.value })}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Framsteg (%)">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={editing.progress_percent ?? 0}
                  onChange={(e) =>
                    setEditing({ ...editing, progress_percent: parseInt(e.target.value, 10) })
                  }
                />
              </Field>
              <Field label="Status">
                <Select
                  value={editing.status ?? 'active'}
                  onChange={(e) =>
                    setEditing({ ...editing, status: e.target.value as Goal['status'] })
                  }
                >
                  {Object.entries(GOAL_STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="flex gap-2">
              <Button onClick={save}>Spara</Button>
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Avbryt
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
