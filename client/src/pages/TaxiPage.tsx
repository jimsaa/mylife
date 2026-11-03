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
  formatKwhValue,
  formatMonthHeadingSv,
  formatSek,
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
          <Link to="/admin/taxi/import">
            <Button>Import</Button>
          </Link>
        }
      />

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

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
                <StatCard label="INKÖRT BRUTTO" value={formatSek(selectedDay?.grossIncome ?? '0')} />
                <StatCard label="EGNA BOKNINGAR" value={formatSek(selectedDay?.ownBookings)} />
                <StatCard label="ÖVRIGA KÖRNINGAR" value={formatSek(selectedDay?.otherIncome)} />
                <StatCard label="INKÖRT NETTO" value={formatSek(selectedDay?.netIncome ?? '0')} />
                <StatCard label="DRICKS" value={formatSek(selectedDay?.tips ?? '0')} />
                <StatCard label="BONUS" value={formatSek(selectedDay?.bonus)} />
                <StatCard label="ARBETAD TID" value={formatHoursValue(selectedDay?.workedHours ?? '0')} />
                <StatCard label="LADDNING" value={formatKwhValue(selectedDay?.chargingKwh ?? '0')} />
              </div>
              {exportText ? (
                <div className="mt-4">
                  <TaxiExportBox text={exportText} />
                </div>
              ) : null}
            </Card>
          ) : null}

          <Card title="Intäkter" className="mb-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard label="TOTALT INKÖRT" value={formatSek(overview.grossIncome)} />
              <StatCard label="EGNA BOKNINGAR" value={formatSek(overview.ownBookings)} />
              <StatCard label="ÖVRIGA KÖRNINGAR" value={formatSek(overview.otherIncome)} />
              <StatCard label="DRICKS" value={formatSek(overview.tips)} />
              <StatCard label="BONUS" value={formatSek(overview.bonus)} />
            </div>
          </Card>

          <Card title="Lön" className="mb-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label="BERÄKNAD LÖNEGRUND" value={formatSek(overview.netIncome)} />
              <StatCard label="BERÄKNAD LÖN" value={formatSek(overview.accruedSalary)} hint={overview.salaryStatusLabel} />
              <StatCard label="PRIVAT NETTOUTTAG" value={formatSek(overview.privateNetTarget)} />
              <StatCard label="PLANERAT UTTAG" value={formatSek(overview.projectedPrivateNet)} />
              <StatCard label="FAKTISKT UTTAG" value={formatSek(overview.privateNetTaken)} />
              <StatCard
                label={Number(overview.projectedShortfall) > 0 ? 'SAKNAS TILL 13 000' : 'ÖVERSKOTT TILL SPARANDE'}
                value={formatSek(
                  Number(overview.projectedShortfall) > 0 ? overview.projectedShortfall : overview.projectedSurplus,
                )}
              />
            </div>
          </Card>

          <Card title="Månadsavräkning" className="mb-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label="1. TOTALT INKÖRT" value={formatSek(overview.grossIncome)} />
              <StatCard label="2. EGNA BOKNINGAR" value={formatSek(overview.ownBookings)} />
              <StatCard label="3. ÖVRIGA KÖRNINGAR" value={formatSek(overview.otherIncome)} />
              <StatCard label="4. DRICKS" value={formatSek(overview.tips)} />
              <StatCard label="5. BONUS" value={formatSek(overview.bonus)} />
              <StatCard label="6. BERÄKNAD LÖN" value={formatSek(overview.accruedSalary)} />
              <StatCard label="7. PRIVAT NETTOUTTAG" value={formatSek(overview.privateNetTaken)} />
              <StatCard label="8. LÖNEÖVERSKOTT" value={formatSek(overview.savings.monthSalarySurplus)} />
              <StatCard label="9. DRICKS + BONUS" value={formatSek(Number(overview.savings.monthTips) + Number(overview.savings.monthBonus))} />
              <StatCard label="10. MÅNADENS SPARANDE" value={formatSek(overview.savings.monthTotal)} />
              <StatCard label="11. ACKUMULERAT SPARSALDO" value={formatSek(overview.savings.total)} />
            </div>
            <p className="mt-4 text-sm text-text-muted">
              {overview.settlementLocked
                ? `Månaden är låst${overview.settlementLockedAt ? ` ${overview.settlementLockedAt}` : ''}. 13 000 kr tas inte ut förrän avräkningen bekräftas.`
                : '13 000 kr tas inte ut förrän månadsavräkningen bekräftas. Överskott och privat uttag bokförs då.'}
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
              <StatCard label="INKÖRT BRUTTO" value={formatSek(overview.grossIncome)} />
              <StatCard label="INKÖRT NETTO" value={formatSek(overview.netIncome)} />
              <StatCard label="DRICKS" value={formatSek(overview.tips)} />
              <StatCard label="ARBETAD TID" value={formatHoursValue(overview.workedHours)} />
              <StatCard label="LADDNING" value={formatKwhValue(overview.chargingKwh)} />
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
