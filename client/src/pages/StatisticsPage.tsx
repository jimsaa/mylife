import { useEffect, useState } from 'react';
import { statsApi } from '../api';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { PieAllocationChart, ProjectHoursChart, TrendChart } from '../components/charts/Charts';
import { formatHours } from '../lib/format';
import type { StatsSummary, StatsTrends } from '../types';

export function StatisticsPage() {
  const [summary7, setSummary7] = useState<StatsSummary | null>(null);
  const [summary30, setSummary30] = useState<StatsSummary | null>(null);
  const [trends30, setTrends30] = useState<StatsTrends | null>(null);

  useEffect(() => {
    Promise.all([statsApi.summary(7), statsApi.summary(30), statsApi.trends(30)])
      .then(([s7, s30, t30]) => {
        setSummary7(s7);
        setSummary30(s30);
        setTrends30(t30);
      })
      .catch(console.error);
  }, []);

  if (!summary7 || !summary30 || !trends30) {
    return <p className="text-text-muted">Laddar statistik...</p>;
  }

  return (
    <div>
      <PageHeader
        title="Statistik"
        subtitle="Förstå var tid och energi går"
      />

      <h2 className="mb-3 text-lg font-semibold">Senaste 7 dagarna</h2>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Taxitimmar" value={formatHours(summary7.taxi_hours)} />
        <StatCard label="Fokuserat arbete" value={formatHours(summary7.focused_work_hours)} />
        <StatCard
          label="Snitt energi"
          value={summary7.avg_energy ?? '—'}
        />
        <StatCard label="Snitt kalorier" value={summary7.avg_calories ?? '—'} />
        <StatCard label="Snitt sömn" value={summary7.avg_sleep ? `${summary7.avg_sleep} h` : '—'} />
        <StatCard label="Snitt humör" value={summary7.avg_mood ?? '—'} />
      </div>

      <Card title="Tid per projekt (7 dagar)" className="mb-6">
        <ProjectHoursChart data={summary7.time_by_project} />
      </Card>

      <h2 className="mb-3 text-lg font-semibold">Senaste 30 dagarna</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Tidsfördelning">
          <PieAllocationChart data={trends30.time_allocation} />
        </Card>
        <Card title="Mest aktiva projekt">
          <ProjectHoursChart data={trends30.most_active_projects} />
        </Card>
        <Card title="Taxitrend">
          <TrendChart data={trends30.taxi_trend} label="Taxitimmar" color="#EAB308" unit=" h" />
        </Card>
        <Card title="Fokuserat arbete">
          <TrendChart data={trends30.focused_work_trend} label="Timmar" unit=" h" />
        </Card>
        <Card title="Energitrend">
          <TrendChart data={trends30.energy_trend} label="Energi" color="#22C55E" />
        </Card>
        <Card title="Humörtrend">
          <TrendChart data={trends30.mood_trend} label="Humör" color="#3B82F6" />
        </Card>
        <Card title="Sömntrend">
          <TrendChart data={trends30.sleep_trend} label="Sömn" color="#6366F1" unit=" h" />
        </Card>
        <Card title="Kaloritrend">
          <TrendChart data={trends30.calorie_trend} label="Kalorier" color="#F97316" unit=" kcal" />
        </Card>
      </div>

      <Card title="Framtida AI-insikter" className="mt-6">
        <p className="text-sm text-text-muted">
          Arkitekturen är förberedd för AI-genererade livsinsikter. Data samlas via{' '}
          <code className="rounded bg-surface-muted px-1">/api/stats/insights-context</code>.
        </p>
      </Card>
    </div>
  );
}
