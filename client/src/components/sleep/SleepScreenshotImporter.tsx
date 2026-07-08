import { useRef, useState } from 'react';
import { sleepImportApi } from '../../api';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Field, Input } from '../ui/Input';
import { SLEEP_FIELD_LABELS, SLEEP_MINUTE_FIELDS } from '../../lib/constants';
import { formatDate, formatMinutes, parseMinutesInput } from '../../lib/format';
import type {
  DuplicateAction,
  DuplicateMatch,
  ExtractedSleepData,
  SleepMetricInput,
  SleepSessionInput,
} from '../../types';

interface SleepScreenshotImporterProps {
  onSaved: () => void;
  onClose: () => void;
}

type Step = 'upload' | 'extracting' | 'confirm' | 'duplicate';

const KNOWN_FIELDS = Object.keys(SLEEP_FIELD_LABELS);

function extractedToSession(extracted: ExtractedSleepData): SleepSessionInput {
  return {
    source: extracted.source,
    date: extracted.date ?? '',
    bedtime: extracted.bedtime,
    wake_time: extracted.wake_time,
    time_in_bed_minutes: extracted.time_in_bed_minutes,
    actual_sleep_minutes: extracted.actual_sleep_minutes,
    sleep_score: extracted.sleep_score,
    overall_rating: extracted.overall_rating,
    deep_sleep_minutes: extracted.deep_sleep_minutes,
    deep_sleep_rating: extracted.deep_sleep_rating,
    rem_sleep_minutes: extracted.rem_sleep_minutes,
    rem_sleep_rating: extracted.rem_sleep_rating,
    light_sleep_minutes: extracted.light_sleep_minutes,
    awake_minutes: extracted.awake_minutes,
    sleep_efficiency_percent: extracted.sleep_efficiency_percent,
    sleep_spo2_percent: extracted.sleep_spo2_percent,
    snoring_minutes: extracted.snoring_minutes,
    snoring_detected: extracted.snoring_detected,
    sleep_avg_heart_rate: extracted.sleep_avg_heart_rate,
    sleep_min_heart_rate: extracted.sleep_min_heart_rate,
    sleep_max_heart_rate: extracted.sleep_max_heart_rate,
    unknown_metrics: extracted.unknown_metrics ?? [],
  };
}

export function SleepScreenshotImporter({ onSaved, onClose }: SleepScreenshotImporterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [imageBase64, setImageBase64] = useState<string>('');
  const [session, setSession] = useState<SleepSessionInput | null>(null);
  const [extractionMethod, setExtractionMethod] = useState<string>('');
  const [extractionConfidence, setExtractionConfidence] = useState<number>(0);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [removedFields, setRemovedFields] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const readFile = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1] ?? '');
      };
      reader.onerror = () => reject(new Error('Kunde inte läsa filen'));
      reader.readAsDataURL(file);
    });

  const handleFile = async (file: File) => {
    setError(null);
    setStep('extracting');
    setFilename(file.name);

    try {
      const base64 = await readFile(file);
      setImageBase64(base64);
      const result = await sleepImportApi.extract(base64, file.name, file.type || 'image/png');
      setSession(extractedToSession(result.extracted));
      setExtractionMethod(result.extracted.extraction_method);
      setExtractionConfidence(result.extracted.extraction_confidence);
      setDuplicates(result.duplicates);
      setRemovedFields(new Set());
      setStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extrahering misslyckades');
      setStep('upload');
    }
  };

  const updateField = (key: string, value: string) => {
    if (!session) return;
    let parsed: unknown = value;
    if (SLEEP_MINUTE_FIELDS.has(key)) {
      parsed = parseMinutesInput(value);
    } else if (key === 'snoring_detected') {
      parsed = value === 'ja' ? true : value === 'nej' ? false : null;
    } else if (
      [
        'sleep_score',
        'sleep_efficiency_percent',
        'sleep_spo2_percent',
        'sleep_avg_heart_rate',
        'sleep_min_heart_rate',
        'sleep_max_heart_rate',
      ].includes(key)
    ) {
      parsed = value ? parseInt(value, 10) : null;
    }
    setSession({ ...session, [key]: parsed });
  };

  const removeField = (key: string) => {
    if (!session) return;
    setRemovedFields(new Set(removedFields).add(key));
    setSession({ ...session, [key]: null });
  };

  const updateMetric = (index: number, field: keyof SleepMetricInput, value: string) => {
    if (!session?.unknown_metrics) return;
    const metrics = [...session.unknown_metrics];
    metrics[index] = { ...metrics[index], [field]: value };
    setSession({ ...session, unknown_metrics: metrics });
  };

  const removeMetric = (index: number) => {
    if (!session?.unknown_metrics) return;
    setSession({
      ...session,
      unknown_metrics: session.unknown_metrics.filter((_, i: number) => i !== index),
    });
  };

  const buildPayload = (duplicateAction?: DuplicateAction, existingSessionId?: number) => {
    if (!session?.date) throw new Error('Datum krävs');
    return {
      session,
      filename,
      extraction_method: extractionMethod,
      extraction_confidence: extractionConfidence,
      screenshot_base64: imageBase64,
      duplicate_action: duplicateAction,
      existing_session_id: existingSessionId ?? null,
    };
  };

  const handleSave = async (duplicateAction?: DuplicateAction, existingSessionId?: number) => {
    if (!session?.date) {
      setError('Datum krävs för att spara.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await sleepImportApi.save(buildPayload(duplicateAction, existingSessionId));
      onSaved();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kunde inte spara';
      if (message.includes('duplicate') || message.includes('409')) {
        setStep('duplicate');
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const onConfirmSave = () => {
    if (duplicates.length > 0) {
      setStep('duplicate');
      return;
    }
    handleSave('keep_both');
  };

  const visibleFields = session
    ? KNOWN_FIELDS.filter((key) => {
        if (key === 'source') return !!session.source;
        const value = session[key as keyof SleepSessionInput];
        return !removedFields.has(key) && value !== null && value !== undefined && value !== '';
      })
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto" title="Importera sömnbild">
        {step === 'upload' && (
          <div>
            <p className="mb-4 text-sm text-text-muted">
              Ladda upp en skärmbild från Samsung Health eller liknande app. All synlig sömnrelaterad
              information extraheras automatiskt.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <Button onClick={() => fileInputRef.current?.click()}>Välj skärmbild</Button>
          </div>
        )}

        {step === 'extracting' && (
          <p className="py-8 text-center text-sm text-text-muted">Analyserar skärmbild...</p>
        )}

        {step === 'confirm' && session && (
          <div>
            <p className="mb-4 text-sm font-medium">Jag hittade följande information:</p>
            <p className="mb-4 text-xs text-text-muted">
              Metod: {extractionMethod} · Säkerhet: {Math.round(extractionConfidence * 100)}%
            </p>

            <div className="space-y-3">
              <Field label="Datum">
                <Input
                  type="date"
                  value={session.date ?? ''}
                  onChange={(e) => setSession({ ...session, date: e.target.value })}
                />
              </Field>

              {visibleFields.filter((key) => key !== 'date').map((key) => (
                <div key={key} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Field label={SLEEP_FIELD_LABELS[key] ?? key}>
                      <Input
                        value={
                          SLEEP_MINUTE_FIELDS.has(key)
                            ? session[key as keyof SleepSessionInput]
                              ? formatMinutes(session[key as keyof SleepSessionInput] as number)
                              : ''
                            : key === 'snoring_detected'
                              ? session.snoring_detected === true
                                ? 'ja'
                                : session.snoring_detected === false
                                  ? 'nej'
                                  : ''
                              : String(session[key as keyof SleepSessionInput] ?? '')
                        }
                        onChange={(e) => updateField(key, e.target.value)}
                      />
                    </Field>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeField(key)}>
                    Ta bort
                  </Button>
                </div>
              ))}

              {(session.unknown_metrics ?? []).map((metric, index) => (
                <div key={`${metric.metric_name}-${index}`} className="rounded-lg border border-border p-3">
                  <p className="mb-2 text-xs font-medium text-text-muted">
                    {metric.original_label || metric.metric_name}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input
                      value={metric.metric_value}
                      onChange={(e) => updateMetric(index, 'metric_value', e.target.value)}
                      placeholder="Värde"
                    />
                    <Input
                      value={metric.metric_unit ?? ''}
                      onChange={(e) => updateMetric(index, 'metric_unit', e.target.value)}
                      placeholder="Enhet"
                    />
                    <Button size="sm" variant="ghost" onClick={() => removeMetric(index)}>
                      Ta bort
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-2">
              <Button onClick={onConfirmSave} disabled={saving}>
                Spara
              </Button>
              <Button variant="secondary" onClick={onClose}>
                Avbryt
              </Button>
            </div>
          </div>
        )}

        {step === 'duplicate' && (
          <div>
            <p className="mb-4 text-sm">
              Det verkar som att denna natt redan har importerats. Vill du uppdatera befintlig data?
            </p>
            {duplicates.map((dup) => (
              <div key={dup.session.id} className="mb-3 rounded-lg border border-border p-3 text-sm">
                <p className="font-medium">{formatDate(dup.session.date)}</p>
                <p className="text-text-muted">
                  {dup.session.bedtime && `Läggtid ${dup.session.bedtime}`}
                  {dup.session.wake_time && ` · Uppvakning ${dup.session.wake_time}`}
                </p>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => handleSave('update', duplicates[0]?.session.id)}
                disabled={saving}
              >
                Uppdatera
              </Button>
              <Button variant="secondary" onClick={() => handleSave('keep_both')} disabled={saving}>
                Behåll båda
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Avbryt
              </Button>
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </Card>
    </div>
  );
}
