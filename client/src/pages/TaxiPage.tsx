import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
import type { TaxiLogMonth } from '../types';

function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function TaxiPage() {
  const [params, setParams] = useSearchParams();
  const fallback = currentYearMonth();
  const year = Number(params.get('year')) || fallback.year;
  const month = Number(params.get('month')) || fallback.month;
  const selectedDate = params.get('date');
  const [overview, setOverview] = useState<TaxiLogMonth | null>(null);
  const [exportText, setExportText] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [reportNotice, setReportNotice] = useState('');
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
      .then((result) => setExportText(result.exportText))
      .catch(() => setExportText(null));
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
            <Link to="/admin/taxi/import">
              <Button>Import</Button>
            </Link>
          </div>
        }
      />

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
