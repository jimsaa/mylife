import { useEffect, useState } from 'react';
import { projectApi, timeApi } from '../api';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input, Select, Textarea } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { formatDateTime, formatMinutes, todayIso } from '../lib/format';
import type { Project, TimeEntry, TimerStatus } from '../types';

export function TimeTrackingPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [timer, setTimer] = useState<TimerStatus | null>(null);
  const [selectedProject, setSelectedProject] = useState<number | ''>('');
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({
    project_id: '' as number | '',
    start_time: '',
    end_time: '',
    notes: '',
  });
  const [, setTick] = useState(0);

  const load = async () => {
    const [p, e, t] = await Promise.all([
      projectApi.list(),
      timeApi.list(todayIso()),
      timeApi.timerStatus(),
    ]);
    setProjects(p);
    setEntries(e);
    setTimer(t);
    if (t.entry?.project_id) setSelectedProject(t.entry.project_id);
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  useEffect(() => {
    if (!timer?.active || timer.paused) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [timer?.active, timer?.paused]);

  const elapsed = (): string => {
    if (!timer?.entry) return '0:00';
    const start = new Date(timer.entry.start_time).getTime();
    const pauseMs = timer.timer?.accumulated_pause_ms ?? 0;
    const extraPause = timer.timer?.paused_at
      ? new Date().getTime() - new Date(timer.timer.paused_at).getTime()
      : 0;
    const ms = Date.now() - start - pauseMs - extraPause;
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const start = async () => {
    await timeApi.startTimer(selectedProject === '' ? null : selectedProject);
    load();
  };

  const pause = async () => {
    if (timer?.paused) await timeApi.resumeTimer();
    else await timeApi.pauseTimer();
    load();
  };

  const stop = async () => {
    await timeApi.stopTimer();
    load();
  };

  const saveManual = async () => {
    if (!manual.start_time || !manual.end_time) return;
    await timeApi.create({
      project_id: manual.project_id === '' ? null : manual.project_id,
      start_time: new Date(manual.start_time).toISOString(),
      end_time: new Date(manual.end_time).toISOString(),
      notes: manual.notes || null,
    });
    setShowManual(false);
    setManual({ project_id: '', start_time: '', end_time: '', notes: '' });
    load();
  };

  return (
    <div>
      <PageHeader
        title="Tid"
        subtitle="Starta, pausa och stoppa med ett klick"
        action={
          <Button variant="secondary" onClick={() => setShowManual(true)}>
            Manuell post
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-48 flex-1">
            <Field label="Projekt">
              <Select
                value={selectedProject}
                onChange={(e) =>
                  setSelectedProject(e.target.value ? parseInt(e.target.value, 10) : '')
                }
                disabled={!!timer?.active}
              >
                <option value="">Inget projekt</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {timer?.active ? (
            <div className="flex items-center gap-3">
              <span className="text-3xl font-mono font-bold text-accent">{elapsed()}</span>
              <Button variant="secondary" onClick={pause}>
                {timer.paused ? 'Fortsätt' : 'Pausa'}
              </Button>
              <Button variant="danger" onClick={stop}>
                Stoppa
              </Button>
            </div>
          ) : (
            <Button onClick={start}>Starta timer</Button>
          )}
        </div>
      </Card>

      <Card title="Dagens poster">
        {entries.length === 0 ? (
          <EmptyState message="Inga tids poster idag." />
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between py-3 text-sm">
                <div className="flex items-center gap-3">
                  {entry.project_color && (
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: entry.project_color }}
                    />
                  )}
                  <div>
                    <p className="font-medium">{entry.project_name ?? 'Inget projekt'}</p>
                    <p className="text-text-muted">
                      {formatDateTime(entry.start_time)}
                      {entry.end_time && ` – ${formatDateTime(entry.end_time)}`}
                    </p>
                  </div>
                </div>
                <span>{entry.end_time ? formatMinutes(entry.duration_minutes) : 'Pågår'}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {showManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md" title="Manuell tidspost">
            <Field label="Projekt">
              <Select
                value={manual.project_id}
                onChange={(e) =>
                  setManual({
                    ...manual,
                    project_id: e.target.value ? parseInt(e.target.value, 10) : '',
                  })
                }
              >
                <option value="">Inget projekt</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start">
                <Input
                  type="datetime-local"
                  value={manual.start_time}
                  onChange={(e) => setManual({ ...manual, start_time: e.target.value })}
                />
              </Field>
              <Field label="Slut">
                <Input
                  type="datetime-local"
                  value={manual.end_time}
                  onChange={(e) => setManual({ ...manual, end_time: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Anteckningar">
              <Textarea
                value={manual.notes}
                onChange={(e) => setManual({ ...manual, notes: e.target.value })}
              />
            </Field>
            <div className="flex gap-2">
              <Button onClick={saveManual}>Spara</Button>
              <Button variant="secondary" onClick={() => setShowManual(false)}>
                Avbryt
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
