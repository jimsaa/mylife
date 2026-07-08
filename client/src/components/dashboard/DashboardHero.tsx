import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { ADMIN_BASE, ENERGY_LABELS } from '../../lib/constants';
import { formatHours } from '../../lib/format';
import type { DashboardHero } from '../../types';

const QUICK_ACTIONS = [
  { to: `${ADMIN_BASE}/tid`, label: 'Logga tid', icon: '➕' },
  { to: `${ADMIN_BASE}/taxi`, label: 'Taxi-pass', icon: '🚕' },
  { to: `${ADMIN_BASE}/somn`, label: 'Registrera sömn', icon: '😴' },
  { to: `${ADMIN_BASE}/mat`, label: 'Lägg till måltid', icon: '🍽' },
  { to: `${ADMIN_BASE}/journal`, label: 'Dagboksanteckning', icon: '📝' },
] as const;

interface DashboardHeroProps {
  hero: DashboardHero;
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/70 px-3 py-2 backdrop-blur-sm">
      <p className="text-[11px] uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-text">{value}</p>
    </div>
  );
}

export function DashboardHeroSection({ hero }: DashboardHeroProps) {
  const energyLabel =
    hero.today_summary.energy !== null
      ? `${hero.today_summary.energy} · ${ENERGY_LABELS[hero.today_summary.energy]}`
      : '—';

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-slate-50 p-5 shadow-sm md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-text md:text-3xl">{hero.greeting}</h1>
        <p className="mt-1 text-sm text-text-muted">Det här är ditt liv i siffror.</p>

        <p className="mt-4 rounded-xl bg-white/60 px-4 py-3 text-sm italic text-teal-900 backdrop-blur-sm">
          {hero.insight}
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal-800">Idag</p>
            <div className="grid grid-cols-2 gap-2">
              <SummaryItem
                label="Loggade timmar"
                value={formatHours(hero.today_summary.logged_hours)}
              />
              <SummaryItem label="Taxi idag" value={formatHours(hero.today_summary.taxi_hours)} />
              <SummaryItem label="Energinivå" value={energyLabel} />
              <SummaryItem
                label="Kalorier idag"
                value={`${hero.today_summary.calories} kcal`}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal-800">
              Denna vecka
            </p>
            <div className="grid grid-cols-2 gap-2">
              <SummaryItem
                label="Arbetade timmar"
                value={formatHours(hero.week_summary.worked_hours)}
              />
              <SummaryItem
                label="Fokusprojekt"
                value={hero.week_summary.focus_project_name ?? '—'}
              />
              <SummaryItem
                label="Sömnsnitt"
                value={
                  hero.week_summary.avg_sleep !== null
                    ? `${hero.week_summary.avg_sleep} h`
                    : '—'
                }
              />
              <SummaryItem
                label="Snitt energi"
                value={
                  hero.week_summary.avg_energy !== null
                    ? String(hero.week_summary.avg_energy)
                    : '—'
                }
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.to} to={action.to}>
              <Button size="sm" variant="secondary" className="bg-white/80">
                {action.icon} {action.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
