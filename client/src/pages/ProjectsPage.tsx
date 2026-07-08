import { useEffect, useState } from 'react';
import { projectApi } from '../api';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input, Select, Textarea } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { PROJECT_STATUS_LABELS } from '../lib/constants';
import { formatHours } from '../lib/format';
import type { Project } from '../types';

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Partial<Project> | null>(null);

  const load = () => projectApi.list(showArchived).then(setProjects).catch(console.error);

  useEffect(() => {
    load();
  }, [showArchived]);

  const save = async () => {
    if (!editing?.name) return;
    if (editing.id) {
      await projectApi.update(editing.id, editing);
    } else {
      await projectApi.create(editing);
    }
    setEditing(null);
    load();
  };

  const setWeeklyFocus = async (id: number) => {
    await projectApi.setWeeklyFocus(id);
    alert('Veckofokus uppdaterat!');
  };

  return (
    <div>
      <PageHeader
        title="Projekt"
        subtitle="Spåra tid, prioritet och ROI"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowArchived(!showArchived)}>
              {showArchived ? 'Dölj arkiverade' : 'Visa arkiverade'}
            </Button>
            <Button onClick={() => setEditing({ name: '', color: '#6B7280', priority: 3, status: 'active' })}>
              Nytt projekt
            </Button>
          </div>
        }
      />

      {projects.length === 0 ? (
        <EmptyState message="Inga projekt hittades." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              action={
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
              }
            >
              <h3 className="font-semibold">{project.name}</h3>
              <p className="text-xs text-text-muted">
                {PROJECT_STATUS_LABELS[project.status]} · Prioritet {project.priority}
                {project.roi_rating && ` · ROI ${project.roi_rating}/5`}
              </p>
              {project.goal && <p className="mt-2 text-sm text-text-muted">{project.goal}</p>}
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="font-semibold">{formatHours(project.total_hours ?? 0)}</p>
                  <p className="text-text-muted">Totalt</p>
                </div>
                <div>
                  <p className="font-semibold">{formatHours(project.hours_last_7_days ?? 0)}</p>
                  <p className="text-text-muted">7 d</p>
                </div>
                <div>
                  <p className="font-semibold">{formatHours(project.hours_last_30_days ?? 0)}</p>
                  <p className="text-text-muted">30 d</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setEditing(project)}>
                  Redigera
                </Button>
                {project.status === 'active' && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => setWeeklyFocus(project.id)}>
                      Veckofokus
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await projectApi.archive(project.id);
                        load();
                      }}
                    >
                      Arkivera
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto" title={editing.id ? 'Redigera projekt' : 'Nytt projekt'}>
            <Field label="Namn">
              <Input
                value={editing.name ?? ''}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status">
                <Select
                  value={editing.status ?? 'active'}
                  onChange={(e) =>
                    setEditing({ ...editing, status: e.target.value as Project['status'] })
                  }
                >
                  {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Prioritet (1–5)">
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={editing.priority ?? 3}
                  onChange={(e) => setEditing({ ...editing, priority: parseInt(e.target.value, 10) })}
                />
              </Field>
            </div>
            <Field label="Färg">
              <Input
                type="color"
                value={editing.color ?? '#6B7280'}
                onChange={(e) => setEditing({ ...editing, color: e.target.value })}
              />
            </Field>
            <Field label="Mål">
              <Input
                value={editing.goal ?? ''}
                onChange={(e) => setEditing({ ...editing, goal: e.target.value })}
              />
            </Field>
            <Field label="Beskrivning">
              <Textarea
                value={editing.description ?? ''}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </Field>
            <Field label="Anteckningar">
              <Textarea
                value={editing.notes ?? ''}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
              />
            </Field>
            <Field label="ROI (1–5)">
              <Input
                type="number"
                min={1}
                max={5}
                value={editing.roi_rating ?? ''}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    roi_rating: e.target.value ? parseInt(e.target.value, 10) : null,
                  })
                }
              />
            </Field>
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
