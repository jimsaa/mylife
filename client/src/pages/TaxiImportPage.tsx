import { useState } from 'react';
import { Link } from 'react-router-dom';
import { taxiLogApi } from '../api';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Textarea } from '../components/ui/Input';
import { StatCard } from '../components/ui/StatCard';
import { formatHoursValue, formatIncomeSource, formatSek } from '../lib/taxilogDisplay';
import type { TaxiLogParseResult } from '../types';

const PLACEHOLDER = `TAXILOG_IMPORT
VERSION=3
DATE=2026-11-03

OWN_BOOKINGS=0
HAND_UP=0
UBER_INCOME=0
BOLT_INCOME=0

BONUS=0
TIPS=0

WORKED_HOURS=0

END_TAXILOG_IMPORT`;

export function TaxiImportPage() {
  const [raw, setRaw] = useState('');
  const [parsed, setParsed] = useState<TaxiLogParseResult | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [pending, setPending] = useState(false);

  async function handleParse() {
    setSaved('');
    try {
      const result = await taxiLogApi.parse(raw);
      setParsed(result);
      setError('');
    } catch (err) {
      setParsed(null);
      setError(err instanceof Error ? err.message : 'Kunde inte tolka importen.');
    }
  }

  async function handleSave() {
    if (!parsed || pending) return;
    setPending(true);
    setError('');
    try {
      try {
        await taxiLogApi.saveDay({ ...parsed.parsed, correctingDate: null });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Kunde inte spara dagen.';
        if (!message.includes('redan sparat')) throw err;
        const confirmed = window.confirm(
          `Datumet ${parsed.parsed.date} är redan sparat. Vill du korrigera just den dagen? Historiken ersätts bara om du bekräftar.`,
        );
        if (!confirmed) {
          setError(message);
          return;
        }
        await taxiLogApi.saveDay({ ...parsed.parsed, correctingDate: parsed.parsed.date });
      }
      setSaved(`Dagen ${parsed.parsed.date} är sparad.`);
      setError('');
    } catch (err) {
      setSaved('');
      setError(err instanceof Error ? err.message : 'Kunde inte spara dagen.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Taxi-import"
        subtitle="VERSION=3 med sex intäktskällor. VERSION=1 och VERSION=2 fungerar fortfarande."
        action={
          <Link to="/admin/taxi">
            <Button variant="secondary">Tillbaka till översikt</Button>
          </Link>
        }
      />

      <Card className="mb-6 max-w-2xl">
        <Textarea
          rows={16}
          spellCheck={false}
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          placeholder={PLACEHOLDER}
        />
        <div className="mt-4">
          <Button type="button" onClick={handleParse}>
            Parse
          </Button>
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        {saved ? <p className="mt-3 text-sm text-emerald-700">{saved}</p> : null}
      </Card>

      {parsed ? (
        <Card title="Tolkat" className="max-w-2xl">
          <p className="mb-4 text-lg font-semibold">
            {parsed.parsed.date} · VERSION={parsed.parsed.version}
          </p>
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <StatCard label="EGNA BOKNINGAR" value={formatIncomeSource(parsed.preview.ownBookings)} />
            <StatCard label="HAND UP" value={formatIncomeSource(parsed.preview.handUp)} />
            <StatCard label="UBER" value={formatIncomeSource(parsed.preview.uberIncome)} />
            <StatCard label="BOLT" value={formatIncomeSource(parsed.preview.boltIncome)} />
            <StatCard label="KÖRINTÄKTER TOTALT" value={formatSek(parsed.preview.grossIncome)} />
            <StatCard label="BONUS" value={formatSek(parsed.preview.bonus)} />
            <StatCard label="DRICKS" value={formatSek(parsed.preview.tips)} />
            <StatCard label="TOTAL INKOMST" value={formatSek(parsed.preview.totalIncome)} />
            <StatCard label="ARBETAD TID" value={formatHoursValue(parsed.preview.workedHours)} />
            <StatCard label="LÖNEGRUNDANDE" value={formatSek(parsed.preview.netIncome)} />
            <StatCard label="UPPSKATTAD LÖN" value={formatSek(parsed.preview.estimatedSalary)} />
            <StatCard label="TILL SPARANDE" value={formatSek(parsed.preview.savingsFromDay)} />
          </div>
          <Button type="button" onClick={handleSave} disabled={pending}>
            {pending ? 'Sparar...' : 'Save day'}
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
