import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { taxiLogApi } from '../api';
import { TaxiIncomeChart } from '../components/taxi/TaxiIncomeChart';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
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

  useEffect(() => {
    taxiLogApi
      .month(year, month)
      .then(setOverview)
      .catch((err: Error) => setError(err.message));
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

  const goToMonth = (nextYear: number, nextMonth: number) => {
    const nextParams = new URLSearchParams();
    nextParams.set('year', String(nextYear));
    nextParams.set('month', String(nextMonth));
    setParams(nextParams);
  };

  return (
    <div>
      <PageHeader
        title="Taxi"
        subtitle="Månadsöversikt för inkomst, lönegrundande och laddning"
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
            <StatCard label="LADDNING" value={formatKwhValue(overview.chargingKwh)} />
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <StatCard label="INKÖRT BRUTTO" value={formatSek(selectedDay?.grossIncome ?? '0')} />
                <StatCard label="INKÖRT NETTO" value={formatSek(selectedDay?.netIncome ?? '0')} />
                <StatCard label="DRICKS" value={formatSek(selectedDay?.tips ?? '0')} />
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

          <Card title="Statistik">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label="INKÖRT BRUTTO" value={formatSek(overview.grossIncome)} />
              <StatCard label="INKÖRT NETTO" value={formatSek(overview.netIncome)} />
              <StatCard label="DRICKS" value={formatSek(overview.tips)} />
              <StatCard label="ARBETAD TID" value={formatHoursValue(overview.workedHours)} />
              <StatCard label="LADDNING" value={formatKwhValue(overview.chargingKwh)} />
              <StatCard
                label="ACKUMULERAD LÖN"
                value={formatSek(overview.accruedSalary)}
                hint={overview.salaryStatusLabel}
              />
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
