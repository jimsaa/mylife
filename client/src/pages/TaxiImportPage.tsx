import { useState } from 'react';
import { Link } from 'react-router-dom';
import { taxiLogApi } from '../api';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Textarea } from '../components/ui/Input';
import { StatCard } from '../components/ui/StatCard';
import { formatHoursValue, formatKwhValue, formatSek } from '../lib/taxilogDisplay';
import type { TaxiLogParseResult } from '../types';

const PLACEHOLDER = `TAXILOG_IMPORT
VERSION=2
DATE=2026-11-02

GROSS_INCOME=1500
OWN_BOOKINGS=800
OTHER_INCOME=700
TIPS=100
BONUS=250
WORKED_HOURS=8
CHARGING_KWH=35.5

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
    if (!parsed) return;
    setPending(true);
    try {
      await taxiLogApi.saveDay(parsed.parsed);
      setSaved(`Dagen ${parsed.parsed.date} är sparad.`);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte spara dagen.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Taxi-import"
        subtitle="VERSION=2 med egna bokningar och bonus. VERSION=1 fungerar fortfarande."
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
            <StatCard label="INKÖRT BRUTTO" value={formatSek(parsed.parsed.grossIncome)} />
            <StatCard label="EGNA BOKNINGAR" value={formatSek(parsed.parsed.ownBookings)} />
            <StatCard label="ÖVRIGA KÖRNINGAR" value={formatSek(parsed.parsed.otherIncome)} />
            <StatCard label="DRICKS" value={formatSek(parsed.parsed.tips)} />
            <StatCard label="BONUS" value={formatSek(parsed.preview.bonus)} />
            <StatCard label="ARBETAD TID" value={formatHoursValue(parsed.parsed.workedHours)} />
            <StatCard label="LADDNING" value={formatKwhValue(parsed.parsed.chargingKwh)} />
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
