import { useEffect, useRef, useState } from 'react';
import { taxiLogApi } from '../api';
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
  markShiftClosed,
  normalizeStockholmDate,
  normalizeStockholmTime,
  stockholmFieldsToInstant,
  parseBookingIds,
  parseShiftAmount,
  planShiftClose,
  removeBreak,
  removeShiftEntry,
  reopenShiftForCorrection,
  resumeBreak,
  saveTaxiShiftDraft,
  setShiftEnd,
  setShiftStart,
  startBreak,
  startShift,
  TAXI_SHIFT_CATEGORIES,
  updateBreak,
  updateShiftEntry,
  type ShiftAmountKey,
  type ShiftClosePlan,
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
  'mt-0.5 block w-full min-w-0 max-w-full min-h-12 rounded-lg border border-border bg-surface px-2 py-1 text-base tabular-nums text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent';

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
  const [closePlan, setClosePlan] = useState<ShiftClosePlan | null>(null);
  const [closeNotice, setCloseNotice] = useState<string | null>(null);
  const [closeBlocked, setCloseBlocked] = useState(false);
  const [closeReady, setCloseReady] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const closeToken = useRef(0);

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
  const sealed = draft.closedAt != null;
  const breakOpen = started && !ended && hasOpenBreak(draft);
  const work = calculateReportedWork(draft, now);
  const canClose = started && ended && work.shiftMs > 0;

  const openEditor = (next: EditorState, currentAmount = '', bookingIds = '') => {
    if (draft.closedAt) return;
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
    if (draft.closedAt) return;
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

  const cancelClose = () => {
    if (closingRef.current) return;
    closeToken.current += 1;
    setClosePlan(null);
    setCloseNotice(null);
    setCloseBlocked(false);
    setCloseError(null);
  };

  const openClose = () => {
    if (draft.closedAt) return;
    const planned = planShiftClose(draft, new Date().toISOString());
    if (!planned.ok) {
      setCloseError(planned.reason);
      setClosePlan(null);
      return;
    }
    setCloseError(null);
    setCloseNotice(null);
    setCloseBlocked(false);
    setCloseReady(false);
    setClosePlan(planned.plan);
    const token = ++closeToken.current;
    const [year, month] = planned.plan.date.split('-').map(Number);
    void Promise.all([taxiLogApi.day(planned.plan.date), taxiLogApi.month(year, month)])
      .then(([existing, overview]) => {
        if (closeToken.current !== token) return;
        if (overview.settlementLocked) {
          setCloseBlocked(true);
          setCloseNotice('Månaden är låst. Lås upp med en uttrycklig korrigering innan du ändrar.');
          return;
        }
        const day = existing.day;
        const registered = Boolean(
          day &&
            (day.sourceCategorized ||
              day.ownBookings != null ||
              day.handUp != null ||
              day.uberIncome != null ||
              day.boltIncome != null ||
              day.bonus != null ||
              Number(day.grossIncome) > 0 ||
              Number(day.workedHours) > 0 ||
              Number(day.tips) > 0),
        );
        setCloseNotice(
          registered ? `Datumet ${planned.plan.date} är redan registrerat. Sparning ersätter den dagen.` : null,
        );
        setCloseReady(true);
      })
      .catch(() => {
        if (closeToken.current !== token) return;
        setCloseReady(true);
      });
  };

  const confirmClose = async () => {
    if (!closePlan || !closeReady || closingRef.current || draft.closedAt || closeBlocked) return;
    closingRef.current = true;
    setClosing(true);
    setCloseError(null);
    const plan = closePlan;
    const source = draft;
    try {
      const parsed = await taxiLogApi.parse(plan.text);
      if (parsed.parsed.date !== plan.date) {
        throw new Error('Importen fick ett annat datum. Ingenting sparades.');
      }
      await taxiLogApi.saveDay({
        date: parsed.parsed.date,
        grossIncome: parsed.parsed.grossIncome,
        tips: parsed.parsed.tips,
        workedHours: parsed.parsed.workedHours,
        ownBookings: parsed.parsed.ownBookings,
        otherIncome: parsed.parsed.otherIncome,
        handUp: parsed.parsed.handUp,
        uberIncome: parsed.parsed.uberIncome,
        boltIncome: parsed.parsed.boltIncome,
        bonus: parsed.parsed.bonus,
      });
      setDraft(markShiftClosed(source, new Date().toISOString(), parsed.parsed.date));
      closeToken.current += 1;
      setClosePlan(null);
      setCloseNotice(null);
      setCloseBlocked(false);
    } catch (error) {
      setCloseError(error instanceof Error ? error.message : 'Dagen kunde inte sparas.');
    } finally {
      closingRef.current = false;
      setClosing(false);
    }
  };

  const commitTime = (
    id: string,
    iso: string | null,
    patch: { date?: string; time?: string },
    allowEmpty: boolean,
    apply: (next: string | null) => void,
  ) => {
    if (draft.closedAt) return;
    const base = timeParts[id] ?? splitStockholm(iso);
    const next = {
      date: patch.date !== undefined ? normalizeStockholmDate(patch.date) : base.date,
      time: patch.time !== undefined ? normalizeStockholmTime(patch.time) : base.time,
    };
    if (!next.date || !next.time) {
      setTimeParts((current) => ({ ...current, [id]: next }));
      if (allowEmpty && iso && !next.date && !next.time) apply(null);
      return;
    }
    const instant = stockholmFieldsToInstant(next.date, next.time);
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
        <p className="text-xs text-text-muted">
          {sealed
            ? `Dagen ${draft.closedDate ?? ''} är sparad. Inget mejl skickas.`
            : 'Dagen sparas först när du bekräftar STÄNG DAG. Inget mejl skickas.'}
        </p>
      </header>

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
                    disabled={sealed}
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
                            className="min-h-11 w-full text-left disabled:opacity-60"
                            disabled={sealed}
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
                              disabled={sealed}
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
                              disabled={sealed}
                              onClick={() => {
                                if (sealed) return;
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

          {sealed ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-text" role="status">
                Dagen {draft.closedDate} är sparad.
              </p>
              <Button
                type="button"
                variant="secondary"
                className="min-h-14 w-full text-base"
                onClick={() => {
                  if (!window.confirm('Öppna dagen för korrigering? Den sparade dagen ligger kvar tills du stänger och sparar igen.')) return;
                  setDraft((current) => (current ? reopenShiftForCorrection(current) : current));
                }}
              >
                Korrigera dagen
              </Button>
            </div>
          ) : !started ? (
            <Button
              type="button"
              className="min-h-14 w-full text-base"
              onClick={() => {
                const startedAt = new Date().toISOString();
                setNow(startedAt);
                setTimeParts((current) => {
                  if (!('shift-start' in current)) return current;
                  const copy = { ...current };
                  delete copy['shift-start'];
                  return copy;
                });
                setDraft((current) => (current ? startShift(current, startedAt) : current));
              }}
            >
              STARTA PASS
            </Button>
          ) : !ended ? (
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
                  const endedAt = new Date().toISOString();
                  setNow(endedAt);
                  setTimeParts((current) => {
                    if (!('shift-end' in current)) return current;
                    const copy = { ...current };
                    delete copy['shift-end'];
                    return copy;
                  });
                  setDraft((current) => (current ? endShift(current, endedAt) : current));
                }}
              >
                PASS SLUT
              </Button>
            </div>
          ) : canClose ? (
            <div className="space-y-1">
              <Button type="button" className="min-h-14 w-full text-base" onClick={openClose}>
                STÄNG DAG
              </Button>
              {closeError && !closePlan ? (
                <p className="text-sm text-red-600" role="alert">
                  {closeError}
                </p>
              ) : null}
              <p className="text-xs leading-snug text-text-muted">
                Passet är avslutat. Ingenting sparas och inget mejl skickas förrän du bekräftar.
              </p>
            </div>
          ) : (
            <p className="text-sm text-red-600" role="alert">
              STÄNG DAG visas när sluttiden är efter starttiden.
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
                <p className="text-sm font-medium text-text">Start</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <label className="min-w-0 text-xs text-text-muted" htmlFor="shift-start-date">
                    Startdatum
                    <input
                      id="shift-start-date"
                      type="date"
                      disabled={sealed}
                      className={timeFieldClass}
                      value={timeValue('shift-start', draft.startedAt).date}
                      onChange={(event) =>
                        commitTime('shift-start', draft.startedAt, { date: event.currentTarget.value }, false, (instant) => {
                          if (!instant) return;
                          setDraft((current) => (current ? setShiftStart(current, instant) : current));
                        })
                      }
                    />
                  </label>
                  <label className="min-w-0 text-xs text-text-muted" htmlFor="shift-start-time">
                    Starttid
                    <input
                      id="shift-start-time"
                      type="time"
                      step={60}
                      disabled={sealed}
                      className={timeFieldClass}
                      value={timeValue('shift-start', draft.startedAt).time}
                      onChange={(event) =>
                        commitTime('shift-start', draft.startedAt, { time: event.currentTarget.value }, false, (instant) => {
                          if (!instant) return;
                          setDraft((current) => (current ? setShiftStart(current, instant) : current));
                        })
                      }
                    />
                  </label>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text">Slut</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <label className="min-w-0 text-xs text-text-muted" htmlFor="shift-end-date">
                    Slutdatum
                    <input
                      id="shift-end-date"
                      type="date"
                      disabled={sealed}
                      className={timeFieldClass}
                      value={timeValue('shift-end', draft.endedAt).date}
                      onChange={(event) =>
                        commitTime('shift-end', draft.endedAt, { date: event.currentTarget.value }, true, (instant) => {
                          setDraft((current) => (current ? setShiftEnd(current, instant) : current));
                        })
                      }
                    />
                  </label>
                  <label className="min-w-0 text-xs text-text-muted" htmlFor="shift-end-time">
                    Sluttid
                    <input
                      id="shift-end-time"
                      type="time"
                      step={60}
                      disabled={sealed}
                      className={timeFieldClass}
                      value={timeValue('shift-end', draft.endedAt).time}
                      onChange={(event) =>
                        commitTime('shift-end', draft.endedAt, { time: event.currentTarget.value }, true, (instant) => {
                          setDraft((current) => (current ? setShiftEnd(current, instant) : current));
                        })
                      }
                    />
                  </label>
                </div>
              </div>
            </div>
            {started && ended && work.shiftMs === 0 ? (
              <p className="mt-2 text-sm text-red-600" role="alert">
                Sluttiden måste vara efter starttiden. Rapporterad arbetstid är 0 min tills intervallet är giltigt.
              </p>
            ) : null}

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
                      disabled={sealed}
                      onClick={() => {
                        if (sealed) return;
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
                          disabled={sealed}
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
                          disabled={sealed}
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
                          disabled={sealed}
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
                          disabled={sealed}
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
              disabled={sealed}
              onClick={() => {
                if (sealed) return;
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

      {closePlan ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onClick={cancelClose}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shift-close-title"
            onClick={(event) => event.stopPropagation()}
          >
            <Card title="Stäng dag">
              <h2 id="shift-close-title" className="sr-only">
                Sammanställning innan dagen sparas
              </h2>
              <dl className="space-y-1 text-sm text-text">
                <div className="flex justify-between gap-3">
                  <dt>Datum</dt>
                  <dd className="font-semibold tabular-nums">{closePlan.date}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Starttid</dt>
                  <dd className="text-right font-semibold tabular-nums">
                    {draft.startedAt ? formatInstant(draft.startedAt) : ''}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Sluttid</dt>
                  <dd className="text-right font-semibold tabular-nums">
                    {draft.endedAt ? formatInstant(draft.endedAt) : ''}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Passtid</dt>
                  <dd className="font-semibold tabular-nums">{formatWorkDuration(work.shiftMs)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Sammanlagd rasttid</dt>
                  <dd className="font-semibold tabular-nums">{formatWorkDuration(work.breakMs)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Rapporterad arbetstid</dt>
                  <dd className="font-semibold tabular-nums">{formatWorkDuration(work.reportedMs)}</dd>
                </div>
                {TAXI_SHIFT_CATEGORIES.map((category) => (
                  <div key={category.id} className="flex justify-between gap-3">
                    <dt>{category.label}</dt>
                    <dd className="font-semibold tabular-nums">{formatSek(categorySum(draft, category.id))}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-3 border-t border-border pt-1">
                  <dt>Total kassa</dt>
                  <dd className="font-semibold tabular-nums">{formatSek(cashTotal(draft))}</dd>
                </div>
              </dl>
              <div className="mt-2 space-y-1">
                <p className="text-xs font-medium text-text">Egen Kund</p>
                {draft.entries.filter((entry) => entry.categoryId === 'ownBookings').length === 0 ? (
                  <p className="text-xs text-text-muted">Ingen post.</p>
                ) : (
                  draft.entries
                    .filter((entry) => entry.categoryId === 'ownBookings')
                    .map((entry) => (
                      <p key={entry.id} className="text-sm text-text">
                        {ownBookingLine(entry.amount, entry.bookingIds)}
                      </p>
                    ))
                )}
                <p className="text-xs text-text-muted">
                  Boknings-ID sparas i utkastet. TaxiLog-dagen har inget fält för dem.
                </p>
              </div>
              {closeNotice ? (
                <p className="mt-2 text-sm text-text" role="status">
                  {closeNotice}
                </p>
              ) : null}
              {closeError ? (
                <p className="mt-2 text-sm text-red-600" role="alert">
                  {closeError}
                </p>
              ) : null}
              <div className="mt-3 grid gap-2">
                <Button
                  type="button"
                  className="min-h-14 w-full text-base"
                  disabled={closing || closeBlocked || !closeReady}
                  onClick={() => void confirmClose()}
                >
                  STÄNG OCH SPARA DAG
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-14 w-full text-base"
                  disabled={closing}
                  onClick={cancelClose}
                >
                  Avbryt
                </Button>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

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
