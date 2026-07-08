import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../api';

import { DashboardHeroSection } from '../components/dashboard/DashboardHero';
import { MorningSleepCard } from '../components/dashboard/MorningSleepCard';

import { Card } from '../components/ui/Card';

import { Button } from '../components/ui/Button';

import { Input } from '../components/ui/Input';

import { StatCard } from '../components/ui/StatCard';

import { EmptyState } from '../components/ui/EmptyState';

import { formatDate, formatDateTime, formatHours } from '../lib/format';

import { ENERGY_LABELS, WORKLOAD_LABELS } from '../lib/constants';

import type { DashboardData } from '../types';



export function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);

  const [focusText, setFocusText] = useState('');

  const [saving, setSaving] = useState(false);



  const load = () => dashboardApi.get().then(setData).catch(console.error);



  useEffect(() => {

    load();

  }, []);



  useEffect(() => {

    if (data?.daily_focus) setFocusText(data.daily_focus.focus_text);

  }, [data?.daily_focus]);



  const saveFocus = async () => {

    if (!data || !focusText.trim()) return;

    setSaving(true);

    try {

      await dashboardApi.setFocus(data.today, focusText.trim());

      await load();

    } finally {

      setSaving(false);

    }

  };



  if (!data) {

    return <p className="text-text-muted">Laddar...</p>;

  }



  return (

    <div>

      <DashboardHeroSection hero={data.hero} />



      <p className="mb-4 text-sm text-text-muted">

        {formatDate(data.today)} · Vecka {data.week_number}

      </p>



      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard label="Planerat idag" value={formatHours(data.planned_hours_today)} />

        <StatCard label="Loggat idag" value={formatHours(data.actual_hours_today)} />

        <StatCard label="Veckans timmar" value={formatHours(data.weekly_total_hours)} />

        <StatCard

          label="Belastning"

          value={WORKLOAD_LABELS[data.workload_indicator]}

          indicator={data.workload_indicator}

        />

      </div>



      <div className="grid gap-4 lg:grid-cols-2">

        <Card title="Det viktigaste idag">

          <Input

            value={focusText}

            onChange={(e) => setFocusText(e.target.value)}

            placeholder="Skriv dagens viktigaste fokus..."

            onKeyDown={(e) => e.key === 'Enter' && saveFocus()}

          />

          <Button className="mt-3" onClick={saveFocus} disabled={saving || !focusText.trim()}>

            Spara fokus

          </Button>

        </Card>



        <Card title="Veckans fokusprojekt">

          {data.weekly_focus_project ? (

            <div className="flex items-center gap-3">

              <span

                className="h-4 w-4 rounded-full"

                style={{ backgroundColor: data.weekly_focus_project.color }}

              />

              <div>

                <p className="font-medium">{data.weekly_focus_project.name}</p>

                <p className="text-sm text-text-muted">

                  {formatHours(data.weekly_focus_project.hours_last_7_days ?? 0)} denna vecka

                </p>

              </div>

            </div>

          ) : (

            <EmptyState message="Inget veckofokus valt. Välj under Projekt." />

          )}

        </Card>



        <MorningSleepCard sleep={data.morning_sleep} onAddSleep={() => navigate('/somn')} />

        <Card title="Dagens energi">

          {data.daily_energy ? (

            <p>

              <span className="text-2xl font-bold">{data.daily_energy}</span>

              <span className="ml-2 text-text-muted">{ENERGY_LABELS[data.daily_energy]}</span>

            </p>

          ) : (

            <EmptyState message="Ingen energinivå registrerad idag." />

          )}

        </Card>



        <Card title="Dagens kalorier">

          <p className="text-2xl font-bold">

            {data.daily_calories}{' '}

            <span className="text-base font-normal text-text-muted">/ {data.calorie_target} kcal</span>

          </p>

          <p className="mt-1 text-sm text-text-muted">

            Kvar: {Math.max(0, data.calorie_target - data.daily_calories)} kcal

          </p>

        </Card>

      </div>



      <Card title="Senaste aktivitet" className="mt-4">

        {data.latest_activities.length === 0 ? (

          <EmptyState message="Ingen tid loggad ännu." />

        ) : (

          <ul className="divide-y divide-border">

            {data.latest_activities.map((entry) => (

              <li key={entry.id} className="flex items-center justify-between py-3 text-sm">

                <div className="flex items-center gap-3">

                  {entry.project_color && (

                    <span

                      className="h-3 w-3 rounded-full"

                      style={{ backgroundColor: entry.project_color }}

                    />

                  )}

                  <div>

                    <p className="font-medium">{entry.project_name ?? 'Inget projekt'}</p>

                    <p className="text-text-muted">{formatDateTime(entry.start_time)}</p>

                  </div>

                </div>

                <span className="text-text-muted">

                  {entry.duration_minutes ? `${(entry.duration_minutes / 60).toFixed(1)} h` : 'Pågår'}

                </span>

              </li>

            ))}

          </ul>

        )}

      </Card>

    </div>

  );

}


