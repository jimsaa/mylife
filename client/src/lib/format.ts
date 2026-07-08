import { format, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';

export function formatDate(dateStr: string, pattern = 'd MMM yyyy'): string {
  return format(parseISO(dateStr), pattern, { locale: sv });
}

export function formatDateTime(dateStr: string): string {
  return format(parseISO(dateStr), 'd MMM HH:mm', { locale: sv });
}

export function formatHours(hours: number): string {
  return `${hours.toFixed(1)} h`;
}

export function formatSleepDuration(minutes: number | null): string {
  if (minutes === null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, '0')} m`;
}

export function parseHhMm(value: string): number | null {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  if (mins >= 60) return null;
  return hours * 60 + mins;
}

export function minutesToHhMm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatDurationHms(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatHoursMinutes(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, '0')} m`;
}

export function formatMinutes(minutes: number | null): string {
  if (minutes === null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return `${h} h ${m} min`;
}

export function formatMinutesValue(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '';
  return String(minutes);
}

export function parseMinutesInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  const match = trimmed.match(/(\d+)\s*h?\s*(\d+)?\s*m?/i);
  if (match) {
    const hours = parseInt(match[1], 10);
    const mins = match[2] ? parseInt(match[2], 10) : 0;
    return hours * 60 + mins;
  }
  return null;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
