import { useEffect, useState } from 'react';
import { sleepCheckinApi } from '../../api';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Field, Input } from '../ui/Input';
import { MORNING_ENERGY_LABELS } from '../../lib/constants';
import { minutesToHhMm, parseHhMm, todayIso } from '../../lib/format';
import type { DailySleepCheckin, MorningReadiness, SaveDailySleepCheckinPayload } from '../../types';

interface MorningSleepCheckInProps {
  onSaved: (readiness: MorningReadiness) => void;
  onClose: () => void;
  existing?: DailySleepCheckin | null;
}

interface FormState {
  sleep_score: string;
  actual_sleep: string;
  deep_sleep: string;
  rem_sleep: string;
  morning_energy: number | null;
}

function toForm(checkin?: DailySleepCheckin | null): FormState {
  if (!checkin) {
    return {
      sleep_score: '',
      actual_sleep: '',
      deep_sleep: '',
      rem_sleep: '',
      morning_energy: null,
    };
  }
  return {
    sleep_score: String(checkin.sleep_score),
    actual_sleep: minutesToHhMm(checkin.actual_sleep_minutes),
    deep_sleep: minutesToHhMm(checkin.deep_sleep_minutes),
    rem_sleep: minutesToHhMm(checkin.rem_sleep_minutes),
    morning_energy: checkin.morning_energy,
  };
}

function buildPayload(form: FormState): SaveDailySleepCheckinPayload | { error: string } {
  const sleepScore = parseInt(form.sleep_score, 10);
  const actualSleep = parseHhMm(form.actual_sleep);
  const deepSleep = parseHhMm(form.deep_sleep);
  const remSleep = parseHhMm(form.rem_sleep);

  if (Number.isNaN(sleepScore) || sleepScore < 0 || sleepScore > 100) {
    return { error: 'Ange sömnpoäng 0–100.' };
  }
  if (actualSleep === null) return { error: 'Ange verklig sovtid som HH:mm (t.ex. 08:07).' };
  if (deepSleep === null) return { error: 'Ange djupsömn som HH:mm (t.ex. 01:49).' };
  if (remSleep === null) return { error: 'Ange REM-sömn som HH:mm (t.ex. 01:39).' };
  if (!form.morning_energy) return { error: 'Välj hur du känner dig idag.' };

  return {
    date: todayIso(),
    sleep_score: sleepScore,
    actual_sleep_minutes: actualSleep,
    deep_sleep_minutes: deepSleep,
    rem_sleep_minutes: remSleep,
    morning_energy: form.morning_energy,
  };
}

export function MorningSleepCheckIn({ onSaved, onClose, existing }: MorningSleepCheckInProps) {
  const [form, setForm] = useState<FormState>(() => toForm(existing));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [duplicate, setDuplicate] = useState<DailySleepCheckin | null>(null);
  const [readiness, setReadiness] = useState<MorningReadiness | null>(null);

  useEffect(() => {
    setForm(toForm(existing));
  }, [existing]);

  const submit = async (updateId?: number) => {
    const payload = buildPayload(form);
    if ('error' in payload) {
      setError(payload.error);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = updateId
        ? await sleepCheckinApi.update(updateId, payload)
        : await sleepCheckinApi.create(payload);
      setReadiness(result.readiness);
      onSaved(result.readiness);
    } catch (err) {
      const apiErr = err as Error & { status?: number; body?: { existing?: DailySleepCheckin } };
      if (apiErr.status === 409 && apiErr.body?.existing) {
        setDuplicate(apiErr.body.existing);
        return;
      }
      setError(apiErr.message || 'Kunde inte spara.');
    } finally {
      setSaving(false);
    }
  };

  if (duplicate) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <Card className="w-full max-w-md" title="Sömn redan registrerad">
          <p className="mb-4 text-sm text-text-muted">
            Du har redan registrerat sömn för idag. Vill du uppdatera den?
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                setDuplicate(null);
                submit(duplicate.id);
              }}
              disabled={saving}
            >
              Uppdatera
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Avbryt
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (readiness) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <Card className="w-full max-w-md" title="Sömn sparad">
          <div className="mb-4 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3">
            <p className="font-medium">
              {readiness.emoji} {readiness.label}
            </p>
            <p className="text-sm text-text-muted">
              Morgonberedskap {readiness.score}/100 — personlig indikator, inte medicinsk rådgivning.
            </p>
          </div>
          <Button onClick={onClose}>Klar</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto" title="Lägg till sömn">
        <p className="mb-4 text-sm text-text-muted">
          Kopiera fem värden från Samsung Health — tar under 20 sekunder.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Sömnpoäng">
            <Input
              type="number"
              min="0"
              max="100"
              inputMode="numeric"
              value={form.sleep_score}
              onChange={(e) => setForm({ ...form, sleep_score: e.target.value })}
              placeholder="76"
              autoFocus
            />
          </Field>
          <Field label="Verklig sovtid">
            <Input
              value={form.actual_sleep}
              onChange={(e) => setForm({ ...form, actual_sleep: e.target.value })}
              placeholder="08:07"
              inputMode="numeric"
            />
          </Field>
          <Field label="Djupsömn">
            <Input
              value={form.deep_sleep}
              onChange={(e) => setForm({ ...form, deep_sleep: e.target.value })}
              placeholder="01:49"
              inputMode="numeric"
            />
          </Field>
          <Field label="REM-sömn">
            <Input
              value={form.rem_sleep}
              onChange={(e) => setForm({ ...form, rem_sleep: e.target.value })}
              placeholder="01:39"
              inputMode="numeric"
            />
          </Field>
        </div>

        <Field label="Hur känner du dig idag?">
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setForm({ ...form, morning_energy: level })}
                className={`rounded-lg border px-3 py-2 text-sm transition ${
                  form.morning_energy === level
                    ? 'border-accent bg-teal-50 text-accent'
                    : 'border-border bg-surface text-text hover:bg-surface-muted'
                }`}
              >
                {MORNING_ENERGY_LABELS[level]}
              </button>
            ))}
          </div>
        </Field>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => submit(existing?.id)} disabled={saving}>
            Spara
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Avbryt
          </Button>
        </div>
      </Card>
    </div>
  );
}
