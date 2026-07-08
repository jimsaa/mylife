import { useCallback, useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventDropArg, EventClickArg, DateSelectArg } from '@fullcalendar/core';
import { calendarApi, projectApi } from '../api';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input, Select, Textarea } from '../components/ui/Input';
import type { CalendarEvent, Project } from '../types';

export function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [editing, setEditing] = useState<Partial<CalendarEvent> | null>(null);
  const calendarRef = useRef<FullCalendar>(null);

  const loadEvents = useCallback(async (start?: string, end?: string) => {
    const data = await calendarApi.list(start, end);
    setEvents(data);
  }, []);

  useEffect(() => {
    projectApi.list().then(setProjects).catch(console.error);
    loadEvents();
  }, [loadEvents]);

  const fcEvents = events.map((e) => ({
    id: String(e.id),
    title: e.title,
    start: e.start_time,
    end: e.end_time,
    backgroundColor: e.color ?? projects.find((p) => p.id === e.project_id)?.color ?? '#6B7280',
    borderColor: e.color ?? projects.find((p) => p.id === e.project_id)?.color ?? '#6B7280',
    extendedProps: e,
  }));

  const handleDatesSet = (info: { startStr: string; endStr: string }) => {
    loadEvents(info.startStr, info.endStr);
  };

  const handleSelect = (info: DateSelectArg) => {
    setEditing({
      title: '',
      start_time: info.startStr,
      end_time: info.endStr,
      project_id: null,
      notes: '',
    });
  };

  const handleEventClick = (info: EventClickArg) => {
    const event = info.event.extendedProps as CalendarEvent;
    setEditing({ ...event });
  };

  const handleEventDrop = async (info: EventDropArg) => {
    const id = parseInt(info.event.id, 10);
    await calendarApi.update(id, {
      start_time: info.event.startStr,
      end_time: info.event.endStr ?? info.event.startStr,
    });
    loadEvents();
  };

  const saveEvent = async () => {
    if (!editing?.title || !editing.start_time || !editing.end_time) return;
    const project = projects.find((p) => p.id === editing.project_id);
    const payload = {
      title: editing.title,
      project_id: editing.project_id ?? null,
      start_time: editing.start_time,
      end_time: editing.end_time,
      color: project?.color ?? editing.color ?? null,
      notes: editing.notes ?? null,
    };

    if (editing.id) {
      await calendarApi.update(editing.id, payload);
    } else {
      await calendarApi.create(payload);
    }
    setEditing(null);
    loadEvents();
  };

  const deleteEvent = async () => {
    if (!editing?.id) return;
    await calendarApi.delete(editing.id);
    setEditing(null);
    loadEvents();
  };

  return (
    <div>
      <PageHeader title="Kalender" subtitle="Planera veckan med drag-and-drop" />

      <Card>
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridWeek,timeGridDay',
          }}
          locale="sv"
          firstDay={1}
          slotMinTime="06:00:00"
          slotMaxTime="24:00:00"
          allDaySlot={false}
          selectable
          editable
          events={fcEvents}
          datesSet={handleDatesSet}
          select={handleSelect}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          height="auto"
        />
      </Card>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md" title={editing.id ? 'Redigera händelse' : 'Ny händelse'}>
            <Field label="Titel">
              <Input
                value={editing.title ?? ''}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                autoFocus
              />
            </Field>
            <Field label="Projekt">
              <Select
                value={editing.project_id ?? ''}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    project_id: e.target.value ? parseInt(e.target.value, 10) : null,
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
                  value={editing.start_time?.slice(0, 16) ?? ''}
                  onChange={(e) =>
                    setEditing({ ...editing, start_time: new Date(e.target.value).toISOString() })
                  }
                />
              </Field>
              <Field label="Slut">
                <Input
                  type="datetime-local"
                  value={editing.end_time?.slice(0, 16) ?? ''}
                  onChange={(e) =>
                    setEditing({ ...editing, end_time: new Date(e.target.value).toISOString() })
                  }
                />
              </Field>
            </div>
            <Field label="Anteckningar">
              <Textarea
                value={editing.notes ?? ''}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
              />
            </Field>
            <div className="flex gap-2">
              <Button onClick={saveEvent}>Spara</Button>
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Avbryt
              </Button>
              {editing.id && (
                <Button variant="danger" className="ml-auto" onClick={deleteEvent}>
                  Ta bort
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
