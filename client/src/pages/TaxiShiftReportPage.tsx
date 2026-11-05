import { useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { formatSek } from '../lib/taxilogDisplay';
import {
  addBreak,
  addShiftEntry,
  calculateReportedWork,
  cashTotal,
  categorySharePercent,
  categorySum,
  drivingGross,
  endShift,
  editShiftAmountInput,
  formatWorkDuration,
  hasOpenBreak,
  instantToStockholmInput,
  loadTaxiShiftDraft,
  parseBookingIds,
  parseShiftAmount,
  removeBreak,
  removeShiftEntry,
  resumeBreak,
  saveTaxiShiftDraft,
  setShiftEnd,
  setShiftStart,
  startBreak,
  startShift,
  stockholmInputToInstant,
  TAXI_SHIFT_CATEGORIES,
  updateBreak,
  updateShiftEntry,
  type ShiftAmountKey,
  type TaxiShiftCategoryId,
  type TaxiShiftDraft,
  type TaxiShiftEntry,
} from '../lib/taxiShiftDraft';

type EditorState =
  | { mode: 'add'; categoryId: TaxiShiftCategoryId }
  | { mode: 'edit'; entry: TaxiShiftEntry };

const stockholmTime = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Stockholm',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function formatInstant(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return stockholmTime.format(date);
}

function amountForInput(amount: string): string {
  return amount.replace('.', ',').replace(/,00$/, '');
}

function displayAmount(value: string): string {
  if (value === '' || value === '-') return value === '-' ? '−0' : '0';
  return value.replace('-', '−');
}

function ownBookingLine(amount: string, bookingIds?: string): string {
  const driven = `Inkört: ${formatSek(amount)}`;
  return bookingIds ? `${driven} [${bookingIds}]` : driven;
}

type AmountPadKey = ShiftAmountKey | 'save';

const amountKeys: AmountPadKey[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  [',', '0', 'backspace'],
  ['clear', 'sign', 'save'],
];

function amountKeyLabel(key: AmountPadKey): string {
  if (key === 'backspace') return '⌫';
  if (key === 'clear') return 'Rensa';
  if (key === 'sign') return '−';
  if (key === 'save') return 'Spara';
  return key;
}

const timeFieldClass =
  'mt-0.5 block w-full min-w-0 max-w-full min-h-11 rounded-lg border border-border bg-surface px-2 py-1 text-base tabular-nums text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent';

function splitStockholm(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: '', time: '' };
  const [date = '', time = ''] = instantToStockholmInput(iso).split('T');
  return { date, time };
}

export function TaxiShiftReportPage() {
  const [draft, setDraft] = useState<TaxiShiftDraft | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [bookingIdInput, setBookingIdInput] = useState('');
  const [amountError, setAmountError] = useState('');
  const [timeParts, setTimeParts] = useState<Record<string, { date: string; time: string }>>({});
  const [now, setNow] = useState(() => new Date().toISOString());

  useEffect(() => {
    setDraft(loadTaxiShiftDraft(window.localStorage));
  }, []);

  useEffect(() => {
    if (!draft) return;
    saveTaxiShiftDraft(window.localStorage, draft);
  }, [draft]);

  useEffect(() => {
    if (!draft?.startedAt || draft.endedAt) return;
    const timer = window.setInterval(() => setNow(new Date().toISOString()), 30_000);
    return () => window.clearInterval(timer);
  }, [draft?.startedAt, draft?.endedAt]);

  if (!draft) {
    return <p className="text-text-muted">Laddar pass...</p>;
  }

  const started = draft.startedAt != null;
  const ended = draft.endedAt != null;
  const breakOpen = started && !ended && hasOpenBreak(draft);
  const work = calculateReportedWork(draft, now);

  const openEditor = (next: EditorState, currentAmount = '', bookingIds = '') => {
    setEditor(next);
    setAmountInput(currentAmount);
    setBookingIdInput(bookingIds);
    setAmountError('');
  };

  const closeEditor = () => {
    setEditor(null);
    setAmountInput('');
    setBookingIdInput('');
    setAmountError('');
  };

  const saveAmount = () => {
    const amount = parseShiftAmount(amountInput.replace(/,$/, ''));
    if (!amount || !editor) {
      setAmountError('Ange ett belopp, till exempel 150 eller -20.');
      return;
    }
    const categoryId = editor.mode === 'add' ? editor.categoryId : editor.entry.categoryId;
    const bookingIds = categoryId === 'ownBookings' ? parseBookingIds(bookingIdInput) : null;
    if (categoryId === 'ownBookings' && bookingIdInput.trim() && !bookingIds) {
      setAmountError('Ange boknings-ID som JS001 eller JS001, JS002.');
      return;
    }
    setDraft((current) => {
      if (!current) return current;
      if (editor.mode === 'add') {
        return addShiftEntry(current, {
          id: crypto.randomUUID(),
          categoryId: editor.categoryId,
          amount,
          recordedAt: new Date().toISOString(),
          ...(bookingIds ? { bookingIds } : {}),
        });
      }
      return updateShiftEntry(current, editor.entry.id, amount, categoryId === 'ownBookings' ? bookingIds : undefined);
    });
    closeEditor();
  };

  const editorCategory = editor
    ? TAXI_SHIFT_CATEGORIES.find((category) =>
        category.id === (editor.mode === 'add' ? editor.categoryId : editor.entry.categoryId),
      )
    : undefined;

  const commitTime = (
    id: string,
    iso: string | null,
    patch: { date?: string; time?: string },
    allowEmpty: boolean,
    apply: (next: string | null) => void,
  ) => {
    const base = timeParts[id] ?? splitStockholm(iso);
    const next = { date: patch.date ?? base.date, time: patch.time ?? base.time };
    if (!next.date || !next.time) {
      setTimeParts((current) => ({ ...current, [id]: next }));
      if (allowEmpty && iso) apply(null);
      return;
    }
    const instant = stockholmInputToInstant(`${next.date}T${next.time}`);
    if (!instant) {
      setTimeParts((current) => ({ ...current, [id]: next }));
      return;
    }
    setTimeParts((current) => {
      if (!(id in current)) return current;
      const copy = { ...current };
      delete copy[id];
      return copy;
    });
    apply(instant);
  };

  const timeValue = (id: string, iso: string | null) => timeParts[id] ?? splitStockholm(iso);

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl" lang="sv-SE">
      <header className="mb-1">
        <h1 className="text-xl font-bold leading-tight text-text">Passrapport</h1>
        <p className="text-xs text-text-muted">Ingenting sparas till dagen förrän ett senare steg.</p>
      </header>

      {!started ? (
        <Button
          type="button"
          className="min-h-12 w-full text-base"
          onClick={() => setDraft((current) => (current ? startShift(current, new Date().toISOString()) : current))}
        >
          STARTA PASS
        </Button>
      ) : (
        <div className="space-y-2">
          <section className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
            {TAXI_SHIFT_CATEGORIES.map((category) => {
              const entries = draft.entries.filter((entry) => entry.categoryId === category.id);
              return (
                <article key={category.id} className="min-w-0 rounded-xl border border-border bg-surface p-2 shadow-sm">
                  <p className="truncate text-xs text-text-muted">{category.label}</p>
                  <p className="text-lg font-semibold leading-tight tabular-nums text-text">
                    {formatSek(categorySum(draft, category.id))}
                  </p>
                  <p className="text-xs font-medium tabular-nums text-text-muted">
                    {categorySharePercent(draft, category.id)} %
                  </p>
                  <Button
                    type="button"
                    className="mt-1 min-h-11 w-full px-2 text-sm"
                    onClick={() => openEditor({ mode: 'add', categoryId: category.id })}
                  >
                    PLUS
                  </Button>
                  {entries.length > 0 ? (
                    <ul className="mt-1.5 space-y-1 border-t border-border pt-1.5">
                      {entries.map((entry) => (
                        <li key={entry.id}>
                          <button
                            type="button"
                            className="min-h-11 w-full text-left"
                            onClick={() =>
                              openEditor(
                                { mode: 'edit', entry },
                                amountForInput(entry.amount),
                                category.id === 'ownBookings' ? entry.bookingIds ?? '' : '',
                              )
                            }
                          >
                            <p className="text-sm font-medium leading-tight text-text">
                              {category.id === 'ownBookings'
                                ? ownBookingLine(entry.amount, entry.bookingIds)
                                : formatSek(entry.amount)}
                            </p>
                            <p className="text-[11px] leading-tight text-text-muted">{formatInstant(entry.recordedAt)}</p>
                          </button>
                          <div className="grid grid-cols-2 gap-1">
                            <Button
                              type="button"
                              variant="secondary"
                              className="min-h-11 px-1 text-xs"
                              aria-label={`Ändra ${formatSek(entry.amount)}`}
                              onClick={() =>
                                openEditor(
                                  { mode: 'edit', entry },
                                  amountForInput(entry.amount),
                                  category.id === 'ownBookings' ? entry.bookingIds ?? '' : '',
                                )
                              }
                            >
                              Ändra
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className="min-h-11 px-1 text-xs"
                              onClick={() => {
                                if (!window.confirm(`Ta bort ${formatSek(entry.amount)} från ${category.label}?`)) return;
                                setDraft((current) => (current ? removeShiftEntry(current, entry.id) : current));
                              }}
                            >
                              Ta bort
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              );
            })}
          </section>

          {!ended ? (
            <div className="grid grid-cols-2 gap-1.5">
              {!breakOpen ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-14 w-full px-2 text-base"
                  onClick={() => {
                    const startedAt = new Date().toISOString();
                    setNow(startedAt);
                    setDraft((current) =>
                      current ? startBreak(current, { id: crypto.randomUUID(), startedAt, endedAt: null }) : current,
                    );
                  }}
                >
                  PAUSE
                </Button>
              ) : (
                <Button
                  type="button"
                  className="min-h-14 w-full px-2 text-base"
                  onClick={() => {
                    const endedAt = new Date().toISOString();
                    setNow(endedAt);
                    setDraft((current) => (current ? resumeBreak(current, endedAt) : current));
                  }}
                >
                  ÅTERUPPTA PASS
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                className="min-h-14 w-full px-2 text-base"
                onClick={() => {
                  if (!window.confirm('Avsluta passet nu? Ingenting sparas till dagen.')) return;
                  setDraft((current) => (current ? endShift(current, new Date().toISOString()) : current));
                }}
              >
                PASS SLUT
              </Button>
            </div>
          ) : (
            <p className="text-xs leading-snug text-text-muted">
              Passet har en sluttid. Tider, raster och poster kan fortfarande ändras. Dagen stängs inte och inget mejl skickas.
            </p>
          )}

          <section className="grid grid-cols-2 gap-1.5 lg:grid-cols-4">
            {(
              [
                ['Körintäkt', formatSek(drivingGross(draft))],
                ['Dricks', formatSek(categorySum(draft, 'tips'))],
                ['Bonusar', formatSek(categorySum(draft, 'bonus'))],
                ['Total kassa', formatSek(cashTotal(draft))],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-xl border border-border bg-surface px-2 py-1.5 shadow-sm">
                <p className="text-[11px] leading-tight text-text-muted">{label}</p>
                <p className="text-base font-semibold leading-tight tabular-nums text-text">{value}</p>
              </div>
            ))}
          </section>

          <section className="rounded-xl border border-border bg-surface p-2.5 shadow-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-text">Start</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <label className="min-w-0 text-xs text-text-muted" htmlFor="shift-start-date">
                    Datum
                    <input
                      id="shift-start-date"
                      type="date"
                      className={timeFieldClass}
                      value={timeValue('shift-start', draft.startedAt).date}
                      onChange={(event) =>
                        commitTime('shift-start', draft.startedAt, { date: event.target.value }, false, (instant) => {
                          if (!instant) return;
                          setDraft((current) => (current ? setShiftStart(current, instant) : current));
                        })
                      }
                    />
                  </label>
                  <label className="min-w-0 text-xs text-text-muted" htmlFor="shift-start-time">
                    Tid
                    <input
                      id="shift-start-time"
                      type="time"
                      className={timeFieldClass}
                      value={timeValue('shift-start', draft.startedAt).time}
                      onChange={(event) =>
                        commitTime('shift-start', draft.startedAt, { time: event.target.value }, false, (instant) => {
                          if (!instant) return;
                          setDraft((current) => (current ? setShiftStart(current, instant) : current));
                        })
                      }
                    />
                  </label>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-text">Slut</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <label className="min-w-0 text-xs text-text-muted" htmlFor="shift-end-date">
                    Datum
                    <input
                      id="shift-end-date"
                      type="date"
                      className={timeFieldClass}
                      value={timeValue('shift-end', draft.endedAt).date}
                      onChange={(event) =>
                        commitTime('shift-end', draft.endedAt, { date: event.target.value }, true, (instant) => {
                          setDraft((current) => (current ? setShiftEnd(current, instant) : current));
                        })
                      }
                    />
                  </label>
                  <label className="min-w-0 text-xs text-text-muted" htmlFor="shift-end-time">
                    Tid
                    <input
                      id="shift-end-time"
                      type="time"
                      className={timeFieldClass}
                      value={timeValue('shift-end', draft.endedAt).time}
                      onChange={(event) =>
                        commitTime('shift-end', draft.endedAt, { time: event.target.value }, true, (instant) => {
                          setDraft((current) => (current ? setShiftEnd(current, instant) : current));
                        })
                      }
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {(
                [
                  ['Passtid', formatWorkDuration(work.shiftMs)],
                  ['Sammanlagd rasttid', formatWorkDuration(work.breakMs)],
                  ['Rapporterad arbetstid', formatWorkDuration(work.reportedMs)],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="min-w-0 rounded-lg bg-surface-muted px-1.5 py-1.5">
                  <p className="text-[11px] leading-tight text-text-muted">{label}</p>
                  <p className="mt-0.5 text-sm font-semibold leading-tight tabular-nums text-text">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface p-2.5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-text">Raster</h2>
              {breakOpen ? <p className="text-xs font-semibold text-accent">Rast pågår</p> : null}
            </div>
            {draft.breaks.length === 0 ? <p className="mt-1 text-xs text-text-muted">Ingen rast registrerad.</p> : null}
            {draft.breaks.map((item, index) => {
              const startMs = new Date(item.startedAt).getTime();
              const endSource = item.endedAt ?? (ended ? draft.endedAt : now);
              const endMs = endSource ? new Date(endSource).getTime() : Number.NaN;
              const duration =
                Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs ? endMs - startMs : 0;
              const startId = `break-start-${item.id}`;
              const endId = `break-end-${item.id}`;
              const startParts = timeValue(startId, item.startedAt);
              const endParts = timeValue(endId, item.endedAt);
              return (
                <div key={item.id} className="mt-2 border-t border-border pt-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-text">
                      Rast {index + 1}
                      <span className="ml-2 text-xs font-normal text-text-muted">
                        {formatWorkDuration(duration)}
                        {!item.endedAt && !ended ? ' · pågår' : ''}
                      </span>
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-11 shrink-0 px-2 text-xs"
                      onClick={() => {
                        if (!window.confirm(`Ta bort rast ${index + 1}?`)) return;
                        setDraft((current) => (current ? removeBreak(current, item.id) : current));
                      }}
                    >
                      Ta bort
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-text">Start</p>
                      <label className="block min-w-0 text-xs text-text-muted" htmlFor={`${startId}-date`}>
                        Datum
                        <input
                          id={`${startId}-date`}
                          type="date"
                          className={timeFieldClass}
                          value={startParts.date}
                          onChange={(event) =>
                            commitTime(startId, item.startedAt, { date: event.target.value }, false, (instant) => {
                              if (!instant) return;
                              setDraft((current) =>
                                current ? updateBreak(current, item.id, { startedAt: instant }) : current,
                              );
                            })
                          }
                        />
                      </label>
                      <label className="mt-1 block min-w-0 text-xs text-text-muted" htmlFor={`${startId}-time`}>
                        Tid
                        <input
                          id={`${startId}-time`}
                          type="time"
                          className={timeFieldClass}
                          value={startParts.time}
                          onChange={(event) =>
                            commitTime(startId, item.startedAt, { time: event.target.value }, false, (instant) => {
                              if (!instant) return;
                              setDraft((current) =>
                                current ? updateBreak(current, item.id, { startedAt: instant }) : current,
                              );
                            })
                          }
                        />
                      </label>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-text">Slut</p>
                      <label className="block min-w-0 text-xs text-text-muted" htmlFor={`${endId}-date`}>
                        Datum
                        <input
                          id={`${endId}-date`}
                          type="date"
                          className={timeFieldClass}
                          value={endParts.date}
                          onChange={(event) =>
                            commitTime(endId, item.endedAt, { date: event.target.value }, true, (instant) => {
                              setDraft((current) =>
                                current ? updateBreak(current, item.id, { endedAt: instant }) : current,
                              );
                            })
                          }
                        />
                      </label>
                      <label className="mt-1 block min-w-0 text-xs text-text-muted" htmlFor={`${endId}-time`}>
                        Tid
                        <input
                          id={`${endId}-time`}
                          type="time"
                          className={timeFieldClass}
                          value={endParts.time}
                          onChange={(event) =>
                            commitTime(endId, item.endedAt, { time: event.target.value }, true, (instant) => {
                              setDraft((current) =>
                                current ? updateBreak(current, item.id, { endedAt: instant }) : current,
                              );
                            })
                          }
                        />
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
            <Button
              type="button"
              variant="secondary"
              className="mt-2 min-h-11 w-full text-sm sm:w-auto"
              onClick={() => {
                const stamp = draft.endedAt ?? draft.startedAt ?? new Date().toISOString();
                setDraft((current) =>
                  current
                    ? addBreak(current, { id: crypto.randomUUID(), startedAt: stamp, endedAt: stamp })
                    : current,
                );
              }}
            >
              Lägg till rast
            </Button>
          </section>
        </div>
      )}


      {editor && editorCategory ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onClick={closeEditor}
        >
          <div
            className="w-full max-w-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shift-amount-title"
            onClick={(event) => event.stopPropagation()}
          >
            <Card title={editor.mode === 'add' ? editorCategory.label : `Ändra ${editorCategory.label}`}>
              <p id="shift-amount-title" className="sr-only">
                Belopp i kronor för {editorCategory.label}
              </p>
              <p
                className="rounded-xl bg-surface-muted px-3 py-4 text-center text-5xl font-semibold tabular-nums tracking-tight text-text"
                aria-live="polite"
              >
                {displayAmount(amountInput)}
              </p>
              {amountError ? <p className="mt-2 text-center text-sm text-red-600">{amountError}</p> : null}
              {editorCategory.id === 'ownBookings' ? (
                <label className="mt-3 block text-xs font-medium text-text" htmlFor="shift-booking-ids">
                  BOKNINGS-ID
                  <input
                    id="shift-booking-ids"
                    type="text"
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="JS001, JS002"
                    value={bookingIdInput}
                    onChange={(event) => {
                      setBookingIdInput(event.target.value);
                      setAmountError('');
                    }}
                    className="mt-1 w-full min-h-11 rounded-lg border border-border bg-surface px-3 text-base text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  <span className="mt-1 block font-normal text-text-muted">Frivilligt. Flera ID:n separeras med kommatecken.</span>
                </label>
              ) : null}
              <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Numerisk knappsats">
                {amountKeys.flat().map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-label={key === 'backspace' ? 'Radera sista tecknet' : key === 'sign' ? 'Byt tecken' : amountKeyLabel(key)}
                    className={`min-h-16 rounded-xl font-semibold active:scale-[0.98] ${
                      key === 'save'
                        ? 'bg-accent text-lg text-white'
                        : key === 'clear'
                          ? 'border-2 border-slate-300 bg-slate-100 text-lg text-slate-950'
                          : 'border-2 border-slate-300 bg-white text-3xl text-slate-950'
                    }`}
                    onClick={() => {
                      if (key === 'save') {
                        saveAmount();
                        return;
                      }
                      setAmountInput((current) => editShiftAmountInput(current, key));
                      setAmountError('');
                    }}
                  >
                    {amountKeyLabel(key)}
                  </button>
                ))}
              </div>
              <Button type="button" variant="secondary" className="mt-3 min-h-14 w-full text-base" onClick={closeEditor}>
                Avbryt
              </Button>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
