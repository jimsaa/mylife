import { useEffect, useState } from 'react';
import { taxiApi } from '../api';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input, Textarea } from '../components/ui/Input';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState } from '../components/ui/EmptyState';
import { TrendChart } from '../components/charts/Charts';
import { formatDate, formatHours, todayIso } from '../lib/format';
import type { TaxiData } from '../types';

export function TaxiPage() {
  const [data, setData] = useState<TaxiData | null>(null);
  const [form, setForm] = useState({
    shift_date: todayIso(),
    shift_start: '',
    shift_end: '',
    hours_worked: '',
    shift_type: '',
    income: '',
    notes: '',
  });

  const load = () => taxiApi.list().then(setData).catch(console.error);

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.hours_worked) return;
    await taxiApi.create({
      shift_date: form.shift_date,
      shift_start: form.shift_start || null,
      shift_end: form.shift_end || null,
      hours_worked: parseFloat(form.hours_worked),
      shift_type: form.shift_type || null,
      income: form.income ? parseFloat(form.income) : null,
      notes: form.notes || null,
    });
    setForm({
      shift_date: todayIso(),
      shift_start: '',
      shift_end: '',
      hours_worked: '',
      shift_type: '',
      income: '',
      notes: '',
    });
    load();
  };

  if (!data) return <p className="text-text-muted">Laddar...</p>;

  const trend = data.shifts.reduce<{ date: string; value: number }[]>((acc, shift) => {
    const existing = acc.find((a) => a.date === shift.shift_date);
    if (existing) existing.value += shift.hours_worked;
    else acc.push({ date: shift.shift_date, value: shift.hours_worked });
    return acc;
  }, []);

  return (
    <div>
      <PageHeader title="Taxi" subtitle="Spåra pass och arbetsbelastning" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard label="Veckans timmar" value={formatHours(data.weekly_hours)} />
        <StatCard label="Månadens timmar" value={formatHours(data.monthly_hours)} />
      </div>

      <Card title="Nytt pass" className="mb-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Datum">
            <Input
              type="date"
              value={form.shift_date}
              onChange={(e) => setForm({ ...form, shift_date: e.target.value })}
            />
          </Field>
          <Field label="Passets start">
            <Input
              type="time"
              value={form.shift_start}
              onChange={(e) => setForm({ ...form, shift_start: e.target.value })}
            />
          </Field>
          <Field label="Passets slut">
            <Input
              type="time"
              value={form.shift_end}
              onChange={(e) => setForm({ ...form, shift_end: e.target.value })}
            />
          </Field>
          <Field label="Timmar">
            <Input
              type="number"
              step="0.5"
              value={form.hours_worked}
              onChange={(e) => setForm({ ...form, hours_worked: e.target.value })}
            />
          </Field>
          <Field label="Passtyp">
            <Input
              value={form.shift_type}
              onChange={(e) => setForm({ ...form, shift_type: e.target.value })}
              placeholder="Dag, natt, helg..."
            />
          </Field>
          <Field label="Inkomst (valfritt)">
            <Input
              type="number"
              value={form.income}
              onChange={(e) => setForm({ ...form, income: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Anteckningar">
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        <Button onClick={save}>Spara pass</Button>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Trend">
          <TrendChart data={trend.slice(-30)} label="Taxitimmar" color="#EAB308" unit=" h" />
        </Card>
        <Card title="Senaste pass">
          {data.shifts.length === 0 ? (
            <EmptyState message="Inga pass loggade ännu." />
          ) : (
            <ul className="divide-y divide-border">
              {data.shifts.slice(0, 10).map((shift) => (
                <li key={shift.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{formatDate(shift.shift_date)}</p>
                    {shift.shift_type && <p className="text-text-muted">{shift.shift_type}</p>}
                  </div>
                  <span>{formatHours(shift.hours_worked)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
