import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { taxiLogApi } from '../api';
import { TaxiIncomeChart } from '../components/taxi/TaxiIncomeChart';
import { TrendChart } from '../components/charts/Charts';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Field, Input } from '../components/ui/Input';
import { StatCard } from '../components/ui/StatCard';
import {
  buildMonthChartDays,
  formatDateTitleSv,
  formatHoursValue,
  formatIncomeSource,
  formatKwhValue,
  formatMonthHeadingSv,
  formatSek,
  formatSharePercent,
  nextYearMonth,
  previousYearMonth,
} from '../lib/taxilogDisplay';
import type { TaxiLogMonth, TaxiOwnBookingLine } from '../types';

function moneyOre(value: string | null | undefined): number {
  const normalized = (value ?? '0').trim().replace(',', '.');
  const negative = normalized.startsWith('-');
  const [whole, fraction = ''] = normalized.replace('-', '').split('.');
  const cents = Number(whole || '0') * 100 + Number((fraction + '00').slice(0, 2));
  return negative ? -cents : cents;
}

function moneyFromOre(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`;
}

function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function TaxiPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const fallback = currentYearMonth();
  const year = Number(params.get('year')) || fallback.year;
  const month = Number(params.get('month')) || fallback.month;
  const selectedDate = params.get('date');
  const [overview, setOverview] = useState<TaxiLogMonth | null>(null);
  const [exportText, setExportText] = useState<string | null>(null);
  const [savedDay, setSavedDay] = useState<TaxiLogMonth['days'][number] | null>(null);
  const [lineEdits, setLineEdits] = useState<TaxiOwnBookingLine[]>([]);
  const [bookingQuery, setBookingQuery] = useState('');
  const [bookingMatch, setBookingMatch] = useState<TaxiOwnBookingLine | null | undefined>(undefined);
  const [bookingSearchError, setBookingSearchError] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [reportNotice, setReportNotice] = useState('');
  const [reviseOpen, setReviseOpen] = useState(false);
  const [reviseDate, setReviseDate] = useState('');
  const [reviseError, setReviseError] = useState('');
  const [revisePending, setRevisePending] = useState(false);
  const [savingsForm, setSavingsForm] = useState({
    date: `${year}-${String(month).padStart(2, '0')}-01`,
    amount: '',
    description: '',
    kind: 'MANUAL_DEPOSIT' as 'MANUAL_DEPOSIT' | 'MANUAL_WITHDRAWAL',
  });

  const loadMonth = () =>
    taxiLogApi
      .month(year, month)
      .then(setOverview)
      .catch((err: Error) => setError(err.message));

  useEffect(() => {
    setReportNotice('');
    loadMonth();
  }, [year, month]);

  useEffect(() => {
    setSavingsForm((current) => ({
      ...current,
      date: `${year}-${String(month).padStart(2, '0')}-01`,
    }));
  }, [year, month]);

  useEffect(() => {
    if (!selectedDate) {
      setExportText(null);
      return;
    }
    taxiLogApi
      .day(selectedDate)
      .then((result) => {
        setExportText(result.exportText);
        setSavedDay(result.day);
        setLineEdits(result.day?.ownBookingLines ?? []);
      })
      .catch(() => {
        setExportText(null);
        setSavedDay(null);
        setLineEdits([]);
      });
  }, [selectedDate]);

  const reportDate = useMemo(() => {
    const dates = overview?.days.map((day) => day.date) ?? [];
    if (dates.length === 0) return '';
    return dates.reduce((latest, date) => (date > latest ? date : latest));
  }, [overview]);

  const sendReport = async () => {
    if (!reportDate || pending) return;
    const confirmed = window.confirm(`Skicka TaxiLog-rapport för ${reportDate}?`);
    if (!confirmed) return;
    setPending(true);
    setError('');
    setReportNotice('');
    try {
      const result = await taxiLogApi.report(reportDate);
      if (!result.sent || !result.recipient) {
        setError('Mejlet kunde inte skickas.');
        return;
      }
      setReportNotice(`Rapport skickad till ${result.recipient}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mejlet kunde inte skickas.');
    } finally {
      setPending(false);
    }
  };

  const chartDays = useMemo(
    () => (overview ? buildMonthChartDays(overview.year, overview.month, overview.days) : []),
    [overview],
  );
  const selectedDay = overview?.days.find((day) => day.date === selectedDate);
  const previous = previousYearMonth(year, month);
  const next = nextYearMonth(year, month);
  const growth = (overview?.savings.growth ?? []).map((point) => ({
    date: `${point.year}-${String(point.month).padStart(2, '0')}`,
    value: Number(point.balance),
  }));

  const searchBooking = async () => {
    const bookingId = bookingQuery.trim();
    if (!bookingId) return;
    setBookingSearchError('');
    try {
      const result = await taxiLogApi.findBooking(bookingId);
      setBookingMatch(result.match);
    } catch (err) {
      setBookingMatch(undefined);
      setBookingSearchError(err instanceof Error ? err.message : 'Sökningen misslyckades.');
    }
  };

  const saveBookingLines = async () => {
    if (!savedDay || !selectedDate || pending) return;
    if (!window.confirm(`Spara ändringarna på ${selectedDate}? Det ersätter den sparade dagen.`)) return;
    setPending(true);
    setError('');
    try {
      const original = (savedDay.ownBookingLines ?? []).filter((line) => line.driverId == null);
      const primary = lineEdits.filter((line) => line.driverId == null).map((line) => ({
        ...line,
        date: selectedDate,
        amount: moneyFromOre(moneyOre(line.amount)),
      }));
      const delta = primary.reduce((sum, line) => sum + moneyOre(line.amount), 0) - original.reduce((sum, line) => sum + moneyOre(line.amount), 0);
      await taxiLogApi.saveDay({
        date: selectedDate,
        grossIncome: delta === 0 ? savedDay.grossIncome : moneyFromOre(moneyOre(savedDay.grossIncome) + delta),
        tips: savedDay.tips,
        workedHours: savedDay.workedHours,
        ownBookings: delta === 0 ? savedDay.ownBookings : moneyFromOre(moneyOre(savedDay.ownBookings) + delta),
        otherIncome: savedDay.otherIncome,
        handUp: savedDay.handUp,
        uberIncome: savedDay.uberIncome,
        boltIncome: savedDay.boltIncome,
        bonus: savedDay.bonus,
        driverId: null,
        correctingDate: selectedDate,
        ownBookingLines: primary,
      });
      const drivers = [...new Set(lineEdits.map((line) => line.driverId).filter((driverId): driverId is string => Boolean(driverId)))];
      for (const driverId of drivers) {
        await taxiLogApi.saveDay({
          date: selectedDate,
          grossIncome: savedDay.grossIncome,
          tips: savedDay.tips,
          workedHours: savedDay.workedHours,
          ownBookings: savedDay.ownBookings,
          driverId,
          correctingDate: selectedDate,
          ownBookingLines: lineEdits.filter((line) => line.driverId === driverId).map((line) => ({
            ...line,
            date: selectedDate,
            amount: moneyFromOre(moneyOre(line.amount)),
          })),
        });
      }
      const refreshed = await taxiLogApi.day(selectedDate);
      setSavedDay(refreshed.day);
      setLineEdits(refreshed.day?.ownBookingLines ?? []);
      setExportText(refreshed.exportText);
      await loadMonth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bokningarna kunde inte sparas.');
    } finally {
      setPending(false);
    }
  };

  const goToMonth = (nextYear: number, nextMonth: number) => {
    const nextParams = new URLSearchParams();
    nextParams.set('year', String(nextYear));
    nextParams.set('month', String(nextMonth));
    setParams(nextParams);
  };

  const runAction = async (action: () => Promise<TaxiLogMonth>) => {
    setPending(true);
    setError('');
    try {
      setOverview(await action());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Åtgärden misslyckades.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Taxi"
        subtitle="Intäkter, lön och ackumulerat sparande"
        action={
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={pending || !reportDate}
              onClick={() => void sendReport()}
            >
              SKICKA RAPPORT TILL TOBBE
            </Button>
            <Button type="button" variant="secondary" onClick={() => { setReviseOpen((open) => !open); setReviseError(''); }}>
              ÄNDRA DAG
            </Button>
            <Link to="/admin/taxi/rapport">
              <Button>MANUELL DAGSREGISTRERING</Button>
            </Link>
            <Link to="/admin/taxi/import">
              <Button>Import</Button>
            </Link>
          </div>
        }
      />

      {reviseOpen ? (
        <Card title="Ändra sparad dag" className="mb-6">
          <p className="mb-3 text-sm text-text-muted">Välj ett datum som redan finns i TaxiLog. Ingenting ändras förrän dagen har hämtats.</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Field label="Datum">
              <Input type="date" value={reviseDate} onChange={(event) => setReviseDate(event.target.value)} aria-label="Datum att korrigera" />
            </Field>
            <Button
              type="button"
              disabled={revisePending}
              onClick={() => {
                if (!/^\d{4}-\d{2}-\d{2}$/.test(reviseDate)) {
                  setReviseError('Välj ett datum.');
                  return;
                }
                setRevisePending(true);
                setReviseError('');
                void taxiLogApi.day(reviseDate)
                  .then((result) => {
                    if (!result.day) {
                      setReviseError(`Datumet ${reviseDate} har ingen sparad dag. Ingenting ändrades.`);
                      return;
                    }
                    navigate('/admin/taxi/rapport', { state: { correctDay: result.day } });
                  })
                  .catch((err: Error) => {
                    setReviseError(err.message || 'Kunde inte hämta dagen. Ingenting ändrades.');
                  })
                  .finally(() => setRevisePending(false));
              }}
            >
              {revisePending ? 'Hämtar...' : 'Hämta sparad dag'}
            </Button>
          </div>
          {reviseError ? <p className="mt-3 text-sm text-red-600" role="alert">{reviseError}</p> : null}
        </Card>
      ) : null}

      <Card title="Sök boknings-ID" className="mb-6">
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void searchBooking();
          }}
        >
          <Input
            value={bookingQuery}
            onChange={(event) => setBookingQuery(event.target.value)}
            placeholder="JS001"
            aria-label="Boknings-ID"
          />
          <Button type="submit" variant="secondary">Sök</Button>
        </form>
        {bookingSearchError ? <p className="mt-2 text-sm text-red-600">{bookingSearchError}</p> : null}
        {bookingMatch === null ? <p className="mt-2 text-sm text-text-muted">Ingen bokning med det ID:t.</p> : null}
        {bookingMatch ? (
          <div className="mt-3 text-sm text-text">
            <p>Boknings-ID: {bookingMatch.bookingId}</p>
            <p>Belopp: {formatSek(bookingMatch.amount)}</p>
            <p>Kördatum: {formatDateTitleSv(bookingMatch.date)}</p>
            <p>Chaufför: {bookingMatch.driverId ?? 'Inte angiven'}</p>
            <p>Arbetsdag: {formatDateTitleSv(bookingMatch.date)}</p>
          </div>
        ) : null}
      </Card>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      {reportNotice ? <p className="mb-4 text-sm text-emerald-700">{reportNotice}</p> : null}

      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl text-text-muted hover:bg-surface hover:text-accent"
          onClick={() => goToMonth(previous.year, previous.month)}
          aria-label="Föregående månad"
        >
          ‹
        </button>
        <h2 className="text-xl font-semibold text-text">{formatMonthHeadingSv(year, month)}</h2>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl text-text-muted hover:bg-surface hover:text-accent"
          onClick={() => goToMonth(next.year, next.month)}
          aria-label="Nästa månad"
        >
          ›
        </button>
      </div>

      {!overview ? (
        <p className="text-text-muted">Laddar...</p>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="INKÖRT BRUTTO" value={formatSek(overview.grossIncome)} />
            <StatCard label="LÖNEGRUNDANDE" value={formatSek(overview.netIncome)} />
            <StatCard label="UPPSKATTAD LÖN" value={formatSek(overview.accruedSalary)} />
            <StatCard label="SPARANDE" value={formatSek(overview.savings.total)} />
          </div>

          <Card title={`LÖNEMÅL — ${formatMonthHeadingSv(overview.year, overview.month)}`} className="mb-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label="INKÖRT BRUTTO (LÖNEGRUNDANDE)" value={formatSek(overview.grossIncome)} />
              <StatCard label="ACKUMULERAD BRUTTOLÖN" value={formatSek(overview.accruedSalary)} />
              <StatCard label="LÖNETRÖSKEL" value={formatSek(overview.privateGrossTarget)} />
              <StatCard label="KVAR TILL TRÖSKEL" value={formatSek(overview.remainingToThreshold)} />
              <StatCard label="YTTERLIGARE INKÖRT BEHÖVS" value={formatSek(overview.additionalGrossIncomeRequired)} />
              <StatCard label="FÖRVÄNTAD UTBETALNING" value={formatDateTitleSv(overview.expectedPaymentDate)} />
            </div>
            <div className="mt-4">
              <div className="mb-2 flex justify-between text-sm text-text-muted">
                <span>Mot 15 500 kr brutto</span>
                <span>{overview.salaryProgressPercent} %</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${Math.min(100, Number(overview.salaryProgressPercent) || 0)}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-text-muted">Dricks och bonus räknas inte in i löneprogressen.</p>
            </div>
          </Card>

          {overview.nextPayment ? (
            <Card title="NÄSTA LÖNEUTBETALNING" className="mb-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                  label="INTJÄNANDEPERIOD"
                  value={`${formatMonthHeadingSv(overview.nextPayment.earningYear, overview.nextPayment.earningMonth)}`}
                />
                <StatCard label="UTBETALNINGSDATUM" value={formatDateTitleSv(overview.nextPayment.paymentDate)} />
                <StatCard label="ACKUMULERAD BRUTTOLÖN" value={formatSek(overview.nextPayment.accruedSalary)} />
                <StatCard label="PRIVAT BRUTTOALLOCERING" value={formatSek(overview.nextPayment.privateGrossAllocation)} />
                <StatCard label="PRELIMINÄRSKATT" value={formatSek(overview.nextPayment.preliminaryTax)} />
                <StatCard label="FÖRVÄNTAD NETTOUTBETALNING" value={formatSek(overview.nextPayment.expectedNetPayout)} />
                <StatCard label="LÖNEÖVERSKOTT TILL SPARANDE" value={formatSek(overview.nextPayment.salarySurplus)} />
              </div>
              <p className="mt-4 text-sm text-text-muted">
                {overview.nextPayment.settlementLocked
                  ? 'Föregående månad är avräknad. Beloppen kommer från den låsta perioden, inte innevarande månads live-intäkter.'
                  : 'Föregående månad är inte avräknad ännu. Den markeras inte som utbetald förrän avräkningen bekräftas.'}
              </p>
            </Card>
          ) : null}

          <Card className="mb-6">
            <TaxiIncomeChart
              year={overview.year}
              month={overview.month}
              days={chartDays}
              selectedDate={selectedDate}
            />
          </Card>

          {selectedDate ? (
            <Card title="Vald dag" className="mb-6">
              <p className="mb-4 text-xl font-semibold">{formatDateTitleSv(selectedDate)}</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard label="EGNA BOKNINGAR" value={formatIncomeSource(selectedDay?.ownBookings)} />
                <StatCard label="HAND UP" value={formatIncomeSource(selectedDay?.handUp)} />
                <StatCard label="UBER" value={formatIncomeSource(selectedDay?.uberIncome)} />
                <StatCard label="BOLT" value={formatIncomeSource(selectedDay?.boltIncome)} />
                <StatCard label="KÖRINTÄKTER TOTALT" value={formatSek(selectedDay?.grossIncome ?? '0')} />
                <StatCard label="BONUS" value={formatIncomeSource(selectedDay?.bonus)} />
                <StatCard label="DRICKS" value={formatSek(selectedDay?.tips ?? '0')} />
                <StatCard label="TOTAL INKOMST" value={formatSek(selectedDay?.totalIncome ?? selectedDay?.grossIncome ?? '0')} />
                <StatCard label="ARBETAD TID" value={formatHoursValue(selectedDay?.workedHours ?? '0')} />
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-text">Individuella bokningar</p>
                {lineEdits.length === 0 ? <p className="text-sm text-text-muted">Inga individuella bokningar sparade för dagen.</p> : null}
                {lineEdits.map((line, index) => (
                  <div key={`${line.bookingId}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_8rem_1fr]">
                    <Input
                      aria-label={`Boknings-ID ${index + 1}`}
                      value={line.bookingId}
                      onChange={(event) =>
                        setLineEdits((current) => current.map((item, itemIndex) => (
                          itemIndex === index ? { ...item, bookingId: event.target.value } : item
                        )))
                      }
                    />
                    <Input
                      aria-label={`Belopp ${index + 1}`}
                      value={line.amount}
                      onChange={(event) =>
                        setLineEdits((current) => current.map((item, itemIndex) => (
                          itemIndex === index ? { ...item, amount: event.target.value } : item
                        )))
                      }
                    />
                    <p className="self-center text-sm text-text-muted">
                      Chaufför: {line.driverId ?? 'Inte angiven'}
                    </p>
                  </div>
                ))}
                {lineEdits.length > 0 ? (
                  <Button type="button" variant="secondary" disabled={pending} onClick={() => void saveBookingLines()}>
                    Spara bokningar
                  </Button>
                ) : null}
              </div>
              {exportText ? (
                <div className="mt-4">
                  <TaxiExportBox text={exportText} />
                </div>
              ) : null}
            </Card>
          ) : null}

          <Card title="Intäkter" className="mb-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="EGNA BOKNINGAR" value={formatIncomeSource(overview.ownBookings)} />
              <StatCard label="HAND UP" value={formatIncomeSource(overview.handUp)} />
              <StatCard label="UBER" value={formatIncomeSource(overview.uberIncome)} />
              <StatCard label="BOLT" value={formatIncomeSource(overview.boltIncome)} />
              <StatCard label="KÖRINTÄKTER TOTALT" value={formatSek(overview.grossIncome)} />
              <StatCard label="BONUS" value={formatIncomeSource(overview.bonus)} />
              <StatCard label="DRICKS" value={formatSek(overview.tips)} />
              <StatCard label="TOTAL INKOMST" value={formatSek(overview.totalIncome)} />
            </div>
          </Card>

          <Card title="Lön" className="mb-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label="ACKUMULERAD BRUTTOLÖN" value={formatSek(overview.accruedSalary)} hint={overview.salaryStatusLabel} />
              <StatCard label="PRIVAT BRUTTOALLOCERING" value={formatSek(overview.privateGrossAllocation)} />
              <StatCard label="PRELIMINÄRSKATT" value={formatSek(overview.preliminaryTax)} />
              <StatCard label="TILLGÄNGLIG NETTOLÖN" value={formatSek(overview.projectedPrivateNet)} />
              <StatCard label="NETTOMÅL" value={formatSek(overview.privateNetTarget)} />
              <StatCard label="FAKTISK NETTOUTBETALNING" value={formatSek(overview.privateNetTaken)} />
              <StatCard
                label={Number(overview.projectedShortfall) > 0 ? 'KVAR TILL 15 500 BRUTTO' : 'BRUTTOÖVERSKOTT TILL SPARANDE'}
                value={formatSek(
                  Number(overview.projectedShortfall) > 0 ? overview.projectedShortfall : overview.projectedSurplus,
                )}
              />
            </div>
          </Card>

          <Card title="Månadsavräkning" className="mb-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label="1. KÖRINTÄKTER TOTALT" value={formatSek(overview.grossIncome)} />
              <StatCard label="2. EGNA BOKNINGAR" value={formatIncomeSource(overview.ownBookings)} />
              <StatCard label="3. HAND UP" value={formatIncomeSource(overview.handUp)} />
              <StatCard label="4. UBER" value={formatIncomeSource(overview.uberIncome)} />
              <StatCard label="5. BOLT" value={formatIncomeSource(overview.boltIncome)} />
              <StatCard label="DRICKS" value={formatSek(overview.tips)} />
              <StatCard label="BONUS" value={formatIncomeSource(overview.bonus)} />
              <StatCard label="6. ACKUMULERAD BRUTTOLÖN" value={formatSek(overview.accruedSalary)} />
              <StatCard label="7. PRIVAT BRUTTOALLOCERING" value={formatSek(overview.privateGrossAllocation)} />
              <StatCard label="PRELIMINÄRSKATT" value={formatSek(overview.preliminaryTax)} />
              <StatCard label="NETTOMÅL" value={formatSek(overview.privateNetTarget)} />
              <StatCard label="FAKTISK NETTOUTBETALNING" value={formatSek(overview.privateNetTaken)} />
              <StatCard label="8. LÖNEÖVERSKOTT (BRUTTO)" value={formatSek(overview.savings.monthSalarySurplus)} />
              <StatCard label="9. DRICKS + BONUS" value={formatSek(Number(overview.savings.monthTips) + Number(overview.savings.monthBonus))} />
              <StatCard label="10. MÅNADENS SPARANDE" value={formatSek(overview.savings.monthTotal)} />
              <StatCard label="11. ACKUMULERAT SPARSALDO" value={formatSek(overview.savings.total)} />
            </div>
            <p className="mt-4 text-sm text-text-muted">
              {overview.settlementLocked
                ? `Månaden är låst${overview.settlementLockedAt ? ` ${overview.settlementLockedAt}` : ''}. 15 500 kr brutto (13 181 kr netto) tas inte ut förrän avräkningen bekräftas.`
                : '15 500 kr brutto (13 181 kr netto efter tabell 33 kolumn 1) tas inte ut förrän månadsavräkningen bekräftas. Bruttoöverskott går till sparande utan extra skatt.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                disabled={pending || overview.settlementLocked}
                onClick={() => runAction(() => taxiLogApi.settle(year, month))}
              >
                Bekräfta och lås månad
              </Button>
              {overview.settlementLocked ? (
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() => runAction(() => taxiLogApi.unlock(year, month))}
                >
                  Lås upp för korrigering
                </Button>
              ) : null}
            </div>
          </Card>

          <Card title="Sparande" className="mb-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard label="TOTALT SPARANDE" value={formatSek(overview.savings.total)} />
              <StatCard label="DRICKS" value={formatSek(overview.savings.fromTips)} />
              <StatCard label="BONUS" value={formatSek(overview.savings.fromBonus)} />
              <StatCard label="LÖNEÖVERSKOTT" value={formatSek(overview.savings.fromSalarySurplus)} />
              <StatCard label="DENNA MÅNAD" value={formatSek(overview.savings.monthTotal)} />
            </div>
            {growth.length > 0 ? (
              <div className="mt-6">
                <TrendChart data={growth} label="Sparsaldo" color="#0d9488" unit=" kr" />
              </div>
            ) : (
              <p className="mt-4 text-sm text-text-muted">Ingen sparkurva ännu.</p>
            )}
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Datum">
                <Input
                  type="date"
                  value={savingsForm.date}
                  onChange={(event) => setSavingsForm({ ...savingsForm, date: event.target.value })}
                />
              </Field>
              <Field label="Belopp">
                <Input
                  value={savingsForm.amount}
                  onChange={(event) => setSavingsForm({ ...savingsForm, amount: event.target.value })}
                />
              </Field>
              <Field label="Beskrivning">
                <Input
                  value={savingsForm.description}
                  onChange={(event) => setSavingsForm({ ...savingsForm, description: event.target.value })}
                />
              </Field>
              <div className="flex items-end gap-2 pb-3">
                <Button
                  disabled={pending || !savingsForm.amount}
                  onClick={() =>
                    runAction(() =>
                      taxiLogApi.savings({
                        ...savingsForm,
                        kind: 'MANUAL_DEPOSIT',
                      }),
                    )
                  }
                >
                  Insättning
                </Button>
                <Button
                  variant="secondary"
                  disabled={pending || !savingsForm.amount}
                  onClick={() =>
                    runAction(() =>
                      taxiLogApi.savings({
                        ...savingsForm,
                        kind: 'MANUAL_WITHDRAWAL',
                      }),
                    )
                  }
                >
                  Uttag
                </Button>
              </div>
            </div>
            {overview.savings.history.length > 0 ? (
              <ul className="mt-4 divide-y divide-border text-sm">
                {[...overview.savings.history].reverse().slice(0, 12).map((entry, index) => (
                  <li key={`${entry.occurredAt}-${entry.kind}-${entry.description}-${index}`} className="flex justify-between py-2">
                    <span>
                      {entry.occurredAt} · {entry.description}
                    </span>
                    <span className="font-medium">{formatSek(entry.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>

          <Card title="Statistik">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label="KÖRINTÄKTER TOTALT" value={formatSek(overview.grossIncome)} />
              <StatCard label="TOTAL INKOMST" value={formatSek(overview.totalIncome)} />
              <StatCard label="EJ KATEGORISERADE KÖRINTÄKTER" value={formatIncomeSource(overview.uncategorizedGross)} />
              <StatCard label="ANDEL EGNA" value={formatSharePercent(overview.sourceShares?.ownBookings)} />
              <StatCard label="ANDEL HAND UP" value={formatSharePercent(overview.sourceShares?.handUp)} />
              <StatCard label="ANDEL UBER" value={formatSharePercent(overview.sourceShares?.uberIncome)} />
              <StatCard label="ANDEL BOLT" value={formatSharePercent(overview.sourceShares?.boltIncome)} />
              <StatCard label="KR PER TIMME" value={formatIncomeSource(overview.incomePerHour?.driving)} />
              <StatCard label="BONUS / TIMME" value={formatIncomeSource(overview.incomePerHour?.bonus)} />
              <StatCard label="DRICKS / TIMME" value={formatIncomeSource(overview.incomePerHour?.tips)} />
              <StatCard label="ARBETAD TID" value={formatHoursValue(overview.workedHours)} />
              <StatCard label="LADDNING (HISTORIK)" value={formatKwhValue(overview.chargingKwh)} />
              <StatCard label="ACKUMULERAD LÖN" value={formatSek(overview.accruedSalary)} hint={overview.salaryStatusLabel} />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function TaxiExportBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-border bg-surface-muted p-4 text-left text-sm text-text">
        {text}
      </pre>
      <Button type="button" variant="secondary" onClick={copyText}>
        {copied ? 'Kopierat' : 'Exportera dag'}
      </Button>
    </div>
  );
}
