import { useRef, useState } from 'react';
import { sleepImportApi } from '../../api';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Field, Input } from '../ui/Input';
import {
  CONFIDENCE_HIGHLIGHT_THRESHOLD,
  MAX_SAMSUNG_IMAGES,
  RECOMMENDED_SAMSUNG_IMAGES,
  SAMSUNG_EDITABLE_FIELDS,
  SAMSUNG_PREVIEW_FIELDS,
  SAMSUNG_PREVIEW_GROUPS,
} from '../../lib/samsungSleepLabels';
import { formatDate, formatMinutes, parseMinutesInput } from '../../lib/format';
import type {
  DuplicateAction,
  DuplicateMatch,
  MorningReadiness,
  SamsungFieldConfidences,
  SamsungFieldFlag,
  SamsungScreenshotInput,
  SamsungSessionConflict,
  SamsungSleepExtracted,
  SamsungSleepSessionInput,
} from '../../types';

interface SamsungSleepImporterProps {
  onSaved: (readiness?: MorningReadiness) => void;
  onClose: () => void;
}

type Step = 'upload' | 'extracting' | 'conflict' | 'confirm' | 'duplicate';

interface UploadImage {
  id: string;
  file: File;
  previewUrl: string;
}

function toSession(extracted: SamsungSleepExtracted): SamsungSleepSessionInput {
  return {
    source: 'Samsung Health Screenshot',
    screenshot_type: 'Sleep Details',
    date: extracted.date ?? '',
    bedtime: extracted.bedtime,
    wake_time: extracted.wake_time,
    time_in_bed_minutes: extracted.time_in_bed_minutes,
    actual_sleep_minutes: extracted.actual_sleep_minutes,
    sleep_score: extracted.sleep_score,
    overall_rating: extracted.overall_rating,
    actual_sleep_rating: extracted.actual_sleep_rating,
    deep_sleep_rating: extracted.deep_sleep_rating,
    rem_rating: extracted.rem_rating,
    rem_sleep_rating: extracted.rem_rating,
    restfulness_rating: extracted.restfulness_rating,
    sleep_latency_rating: extracted.sleep_latency_rating,
    awake_minutes: extracted.awake_minutes,
    awake_percent: extracted.awake_percent,
    rem_sleep_minutes: extracted.rem_sleep_minutes,
    rem_percent: extracted.rem_percent,
    light_sleep_minutes: extracted.light_sleep_minutes,
    light_percent: extracted.light_percent,
    deep_sleep_minutes: extracted.deep_sleep_minutes,
    deep_percent: extracted.deep_percent,
    sleep_spo2_min: extracted.sleep_spo2_min,
    sleep_spo2_avg: extracted.sleep_spo2_avg,
    sleep_spo2_max: extracted.sleep_spo2_max,
    blood_oxygen_graph_detected: extracted.blood_oxygen_graph_detected,
  };
}

function displayValue(key: string, session: SamsungSleepSessionInput): string {
  const value = session[key as keyof SamsungSleepSessionInput];
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'boolean') return value ? 'Ja' : 'Nej';
  if (
    [
      'time_in_bed_minutes',
      'actual_sleep_minutes',
      'rem_sleep_minutes',
      'light_sleep_minutes',
      'deep_sleep_minutes',
      'awake_minutes',
    ].includes(key)
  ) {
    return formatMinutes(value as number);
  }
  if (['sleep_spo2_min', 'sleep_spo2_avg', 'sleep_spo2_max'].includes(key)) {
    return `${value}%`;
  }
  return String(value);
}

function hasFieldValue(key: string, session: SamsungSleepSessionInput): boolean {
  return displayValue(key, session) !== '';
}

function formatFieldDisplay(
  field: { key: string; format: (value: unknown) => string; percentKey?: string },
  session: SamsungSleepSessionInput
): string {
  const value = field.format(session[field.key as keyof SamsungSleepSessionInput]);
  if (field.percentKey) {
    const pct = session[field.percentKey as keyof SamsungSleepSessionInput];
    if (pct !== null && pct !== undefined && pct !== '') return `${value} (${pct}%)`;
  }
  return value;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('Kunde inte läsa filen'));
    reader.readAsDataURL(file);
  });
}

function createUploadImage(file: File): UploadImage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

export function SamsungSleepImporter({ onSaved, onClose }: SamsungSleepImporterProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<UploadImage[]>([]);
  const [previewImage, setPreviewImage] = useState<UploadImage | null>(null);
  const [session, setSession] = useState<SamsungSleepSessionInput | null>(null);
  const [fieldConfidences, setFieldConfidences] = useState<SamsungFieldConfidences>({});
  const [fieldFlags, setFieldFlags] = useState<Partial<Record<string, SamsungFieldFlag>>>({});
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [morningReadiness, setMorningReadiness] = useState<MorningReadiness | null>(null);
  const [userConfirmed, setUserConfirmed] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [sessionConflicts, setSessionConflicts] = useState<SamsungSessionConflict[]>([]);
  const [screenshotPayload, setScreenshotPayload] = useState<SamsungScreenshotInput[]>([]);
  const [filenames, setFilenames] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const incoming = Array.from(fileList).filter((file) => file.type.startsWith('image/'));
    if (!incoming.length) return;

    setImages((current) => {
      const remaining = MAX_SAMSUNG_IMAGES - current.length;
      if (remaining <= 0) {
        setError(`Max ${MAX_SAMSUNG_IMAGES} bilder.`);
        return current;
      }
      return [...current, ...incoming.slice(0, remaining).map(createUploadImage)];
    });
    setError(null);
  };

  const removeImage = (id: string) => {
    setImages((current) => {
      const target = current.find((image) => image.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((image) => image.id !== id);
    });
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    setImages((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const runExtract = async (selectedImages: UploadImage[]) => {
    if (!selectedImages.length) {
      setError('Lägg till minst en bild.');
      return;
    }

    setError(null);
    setStep('extracting');

    try {
      const payload: SamsungScreenshotInput[] = await Promise.all(
        selectedImages.map(async (image) => ({
          image_base64: await readFileAsBase64(image.file),
          filename: image.file.name,
        }))
      );

      const result = await sleepImportApi.samsungExtract(payload);
      setScreenshotPayload(payload);
      setFilenames(result.filenames);
      setSession(toSession(result.extracted));
      setFieldConfidences(result.field_confidences);
      setFieldFlags(result.field_flags);
      setRequiresConfirmation(result.requires_user_confirmation);
      setMorningReadiness(result.morning_readiness_preview);
      setUserConfirmed(false);
      setConfidence(result.extracted.extraction_confidence);
      setDuplicates(result.duplicates);
      setSessionConflicts(result.session_conflicts);

      if (result.has_session_conflict) {
        setStep('conflict');
      } else {
        setStep('confirm');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extrahering misslyckades');
      setStep('upload');
    }
  };

  const updateField = (key: string, value: string) => {
    if (!session) return;
    let parsed: unknown = value;
    if (
      [
        'time_in_bed_minutes',
        'actual_sleep_minutes',
        'rem_sleep_minutes',
        'light_sleep_minutes',
        'deep_sleep_minutes',
        'awake_minutes',
      ].includes(key)
    ) {
      parsed = parseMinutesInput(value);
    } else if (key === 'sleep_score') {
      parsed = value ? parseInt(value, 10) : null;
    } else if (['sleep_spo2_min', 'sleep_spo2_avg', 'sleep_spo2_max'].includes(key)) {
      parsed = value ? parseInt(value.replace('%', ''), 10) : null;
    }
    setSession({ ...session, [key]: parsed });
  };

  const save = async (duplicateAction?: DuplicateAction, existingSessionId?: number, confirmed = userConfirmed) => {
    if (!session?.date) {
      setError('Datum krävs.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await sleepImportApi.samsungSave({
        session,
        filename: filenames[0] ?? null,
        filenames,
        extraction_confidence: confidence,
        screenshots: screenshotPayload,
        duplicate_action: duplicateAction,
        existing_session_id: existingSessionId ?? null,
        user_confirmed: confirmed,
        field_confidences_json: JSON.stringify(fieldConfidences),
        extraction_flags_json: JSON.stringify(fieldFlags),
      });
      onSaved(result.morning_readiness);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kunde inte spara';
      if (message.includes('duplicate') || duplicates.length > 0) {
        setStep('duplicate');
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const onSaveClick = () => {
    if (requiresConfirmation && !userConfirmed) {
      setError('Kontrollera markerade fält och klicka Bekräfta innan du sparar.');
      return;
    }
    if (duplicates.length > 0) {
      setStep('duplicate');
      return;
    }
    save('keep_both', undefined, userConfirmed || !requiresConfirmation);
  };

  const fieldConfidence = (key: string) => fieldConfidences[key] ?? 0;
  const fieldFlag = (key: string) => fieldFlags[key];
  const needsHighlight = (key: string) => {
    const conf = fieldConfidence(key);
    return conf > 0 && conf < CONFIDENCE_HIGHLIGHT_THRESHOLD;
  };
  const needsConfirm = (key: string) =>
    fieldFlag(key) === 'requires_confirmation' || fieldFlag(key) === 'suspicious';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto" title="Importera Samsung-sömn">
        {step === 'upload' && (
          <div>
            <p className="mb-4 text-sm text-text-muted">
              Ladda upp dina 3 Samsung Health-skärmbilder: Översikt, Sömnfaktorer och Sömnstadier.
              Extrahering sker lokalt med OCR — inga externa API:er.
            </p>

            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">
                Bilder: {images.length} av {RECOMMENDED_SAMSUNG_IMAGES}
              </p>
              <Button
                variant="secondary"
                onClick={() => inputRef.current?.click()}
                disabled={images.length >= MAX_SAMSUNG_IMAGES}
              >
                ➕ Lägg till bild
              </Button>
            </div>

            {images.length > 0 && (
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((image, index) => (
                  <div key={image.id} className="rounded-lg border border-border p-2">
                    <button
                      type="button"
                      className="mb-2 block w-full overflow-hidden rounded-md"
                      onClick={() => setPreviewImage(image)}
                    >
                      <img
                        src={image.previewUrl}
                        alt={image.file.name}
                        className="h-28 w-full object-cover"
                      />
                    </button>
                    <p className="truncate text-xs text-text-muted">{image.file.name}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Button variant="ghost" onClick={() => moveImage(index, -1)} disabled={index === 0}>
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => moveImage(index, 1)}
                        disabled={index === images.length - 1}
                      >
                        ↓
                      </Button>
                      <Button variant="ghost" onClick={() => removeImage(image.id)}>
                        Ta bort
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => runExtract(images)} disabled={!images.length}>
                Importera
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Avbryt
              </Button>
            </div>
          </div>
        )}

        {step === 'extracting' && (
          <p className="py-8 text-center text-sm text-text-muted">
            Läser {images.length} Samsung Health-skärmbild{images.length === 1 ? '' : 'er'}...
          </p>
        )}

        {step === 'conflict' && (
          <div>
            <p className="mb-4 text-sm font-medium">
              Det verkar som att bilderna tillhör olika nätter.
            </p>
            <div className="mb-4 space-y-2">
              {sessionConflicts.map((conflict) => (
                <div key={conflict.image_index} className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
                  <p className="font-medium">{conflict.filename ?? `Bild ${conflict.image_index + 1}`}</p>
                  <p className="text-text-muted">
                    {conflict.date ? formatDate(conflict.date) : 'Datum saknas'}
                    {conflict.bedtime ? ` · Läggtid ${conflict.bedtime}` : ''}
                    {conflict.wake_time ? ` · Uppstigning ${conflict.wake_time}` : ''}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setStep('upload')}>
                Justera bilder
              </Button>
              <Button onClick={() => setStep('confirm')}>Fortsätt ändå</Button>
              <Button variant="ghost" onClick={onClose}>
                Avbryt
              </Button>
            </div>
          </div>
        )}

        {step === 'confirm' && session && (
          <div>
            <p className="mb-1 text-sm font-medium">Jag hittade följande:</p>
            <p className="mb-4 text-xs text-text-muted">
              {images.length} bilder · OCR-säkerhet: {Math.round(confidence * 100)}%
            </p>

            {requiresConfirmation && !userConfirmed && (
              <p className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Kontrollera markerade fält innan du sparar. Misstänkta värden sparas aldrig automatiskt.
              </p>
            )}

            {morningReadiness && (
              <div className="mb-4 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3">
                <p className="text-sm font-medium">
                  {morningReadiness.emoji} Morgonberedskap: {morningReadiness.label}
                </p>
                <p className="text-xs text-text-muted">Poäng: {morningReadiness.score}/100</p>
              </div>
            )}

            {!editing ? (
              <div className="space-y-5">
                {SAMSUNG_PREVIEW_GROUPS.map((group) => {
                  const visibleFields = group.fields.filter((field) => hasFieldValue(field.key, session));
                  if (!visibleFields.length) return null;
                  return (
                    <div key={group.title}>
                      <h3 className="mb-2 text-sm font-semibold">{group.title}</h3>
                      <ul className="space-y-2">
                        {visibleFields.map((field) => (
                          <li
                            key={field.key}
                            className={`flex items-start gap-2 text-sm ${
                              needsConfirm(field.key)
                                ? 'rounded-md border border-red-200 bg-red-50 px-2 py-1'
                                : needsHighlight(field.key)
                                  ? 'rounded-md bg-amber-50 px-2 py-1'
                                  : ''
                            }`}
                          >
                            <span className="text-teal-600">✓</span>
                            <span>
                              {field.label}:{' '}
                              <strong>{formatFieldDisplay(field, session)}</strong>
                              {fieldConfidence(field.key) > 0 && (
                                <span className="ml-1 text-xs text-text-muted">
                                  ({Math.round(fieldConfidence(field.key))}%)
                                </span>
                              )}
                              {needsConfirm(field.key) && (
                                <span className="ml-1 text-xs font-medium text-red-600">· kräver bekräftelse</span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
                {session.blood_oxygen_graph_detected && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">Syre</h3>
                    <p className="text-sm text-text-muted">✓ Syregraf upptäckt (inga värden lästa)</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <Field label="Datum">
                  <Input
                    type="date"
                    value={session.date}
                    onChange={(e) => updateField('date', e.target.value)}
                  />
                </Field>
                {SAMSUNG_EDITABLE_FIELDS.filter((k) => k !== 'date').map((key) => (
                  <Field
                    key={key}
                    label={SAMSUNG_PREVIEW_FIELDS.find((f) => f.key === key)?.label ?? key}
                  >
                    <Input
                      value={displayValue(key, session)}
                      onChange={(e) => updateField(key, e.target.value)}
                    />
                  </Field>
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              {requiresConfirmation && !userConfirmed && (
                <Button variant="secondary" onClick={() => { setUserConfirmed(true); setError(null); }}>
                  Bekräfta
                </Button>
              )}
              <Button onClick={onSaveClick} disabled={saving}>
                Spara
              </Button>
              <Button variant="secondary" onClick={() => setEditing(!editing)}>
                {editing ? 'Visa förhandsgranskning' : 'Redigera'}
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Avbryt
              </Button>
            </div>
          </div>
        )}

        {step === 'duplicate' && (
          <div>
            <p className="mb-4 text-sm">
              Den här natten verkar redan finnas. Vill du uppdatera den?
            </p>
            {duplicates.map((dup) => (
              <div key={dup.session.id} className="mb-3 rounded-lg border border-border p-3 text-sm">
                <p className="font-medium">{formatDate(dup.session.date)}</p>
                <p className="text-text-muted">
                  {dup.session.bedtime && `Läggtid ${dup.session.bedtime}`}
                  {dup.session.wake_time && ` · Uppstigning ${dup.session.wake_time}`}
                </p>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => save('update', duplicates[0]?.session.id)} disabled={saving}>
                Uppdatera
              </Button>
              <Button variant="secondary" onClick={() => save('keep_both')} disabled={saving}>
                Behåll båda
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Avbryt
              </Button>
            </div>
          </div>
        )}

        {previewImage && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
            <div className="max-h-[90vh] max-w-3xl overflow-auto rounded-lg bg-white p-4">
              <img
                src={previewImage.previewUrl}
                alt={previewImage.file.name}
                className="max-h-[75vh] w-full object-contain"
              />
              <div className="mt-4 flex justify-end">
                <Button variant="secondary" onClick={() => setPreviewImage(null)}>
                  Stäng
                </Button>
              </div>
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </Card>
    </div>
  );
}
