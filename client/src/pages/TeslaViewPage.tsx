import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { sleepCheckinApi, taxiTimerApi, teslaApi } from '../api';
import { MORNING_ENERGY_LABELS } from '../lib/constants';
import {
  formatDate,
  formatDurationHms,
  formatHours,
  formatHoursMinutes,
  minutesToHhMm,
  parseHhMm,
} from '../lib/format';
import type { SaveDailySleepCheckinPayload, TeslaViewData, TeslaViewEvent } from '../types';

function TeslaSection({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-white/10 bg-white/[0.04] p-5 ${className}`}
    >
      {title && <h2 className="mb-4 text-base font-medium tracking-wide text-slate-400">{title}</h2>}
      {children}
    </section>
  );
}

function TeslaButton({
  children,
  onClick,
  variant = 'primary',
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  const styles = {
    primary: 'bg-teal-600 text-white hover:bg-teal-500',
    secondary: 'border border-white/20 bg-white/5 text-slate-100 hover:bg-white/10',
    danger: 'border border-red-400/30 bg-red-950/40 text-red-200 hover:bg-red-950/60',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-14 flex-1 rounded-xl px-4 text-lg font-medium transition disabled:opacity-50 ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

function EventDetailModal({ event, onClose }: { event: TeslaViewEvent; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121820] p-6 text-slate-100">
        <p className="text-sm text-slate-400">{event.time}</p>
        <h3 className="mt-1 text-2xl font-semibold">{event.title}</h3>
        {event.project_name && (
          <p className="mt-2 text-slate-300">Projekt: {event.project_name}</p>
        )}
        {event.notes && <p className="mt-3 text-slate-400">{event.notes}</p>}
        <div className="mt-6">
          <TeslaButton onClick={onClose} variant="secondary">
            Stäng
          </TeslaButton>
        </div>
      </div>
    </div>
  );
}

export function TeslaViewPage() {
  const [data, setData] = useState<TeslaViewData | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [timerPaused, setTimerPaused] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TeslaViewEvent | null>(null);
  const [showSleepForm, setShowSleepForm] = useState(false);
  const [sleepSaving, setSleepSaving] = useState(false);
  const [sleepSaved, setSleepSaved] = useState(false);
  const [sleepForm, setSleepForm] = useState({
    sleep_score: '',
    actual_sleep: '',
    deep_sleep: '',
    rem_sleep: '',
    morning_energy: null as number | null,
  });

  const load = () => teslaApi.get().then(setData).catch(console.error);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!data) return;
    setElapsed(data.taxi_timer.elapsed_seconds);
    setTimerPaused(data.taxi_timer.paused);
  }, [data?.taxi_timer.elapsed_seconds, data?.taxi_timer.paused, data?.taxi_timer.active]);

  useEffect(() => {
    if (!data?.taxi_timer.active || timerPaused) return;
    const id = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, [data?.taxi_timer.active, timerPaused]);

  useEffect(() => {
    if (!data?.sleep?.checkin) return;
    const checkin = data.sleep.checkin;
    setSleepForm({
      sleep_score: String(checkin.sleep_score),
      actual_sleep: minutesToHhMm(checkin.actual_sleep_minutes),
      deep_sleep: minutesToHhMm(checkin.deep_sleep_minutes),
      rem_sleep: minutesToHhMm(checkin.rem_sleep_minutes),
      morning_energy: checkin.morning_energy,
    });
  }, [data?.sleep?.checkin]);

  const refreshTimer = async () => {
    await load();
  };

  const startTaxi = async () => {
    await taxiTimerApi.start();
    await refreshTimer();
  };

  const togglePause = async () => {
    if (timerPaused) await taxiTimerApi.resume();
    else await taxiTimerApi.pause();
    await refreshTimer();
  };

  const stopTaxi = async () => {
    await taxiTimerApi.stop();
    await refreshTimer();
  };

  const saveSleep = async () => {
    const sleepScore = parseInt(sleepForm.sleep_score, 10);
    const actualSleep = parseHhMm(sleepForm.actual_sleep);
    const deepSleep = parseHhMm(sleepForm.deep_sleep);
    const remSleep = parseHhMm(sleepForm.rem_sleep);
    if (
      Number.isNaN(sleepScore) ||
      actualSleep === null ||
      deepSleep === null ||
      remSleep === null ||
      !sleepForm.morning_energy
    ) {
      return;
    }

    const payload: SaveDailySleepCheckinPayload = {
      sleep_score: sleepScore,
      actual_sleep_minutes: actualSleep,
      deep_sleep_minutes: deepSleep,
      rem_sleep_minutes: remSleep,
      morning_energy: sleepForm.morning_energy,
    };

    setSleepSaving(true);
    try {
      await sleepCheckinApi.upsert(payload);
      setSleepSaved(true);
      setShowSleepForm(false);
      await load();
      setTimeout(() => setSleepSaved(false), 2500);
    } finally {
      setSleepSaving(false);
    }
  };

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0f14] text-xl text-slate-400">
        Laddar...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f14] text-slate-100">
      <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
        <header className="mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Tesla View</p>
          <h1 className="mt-2 text-3xl font-light text-slate-100">My Life</h1>
          <p className="mt-1 text-lg text-slate-400">{formatDate(data.today, 'd MMMM')}</p>
        </header>

        <div className="space-y-5">
          <TeslaSection title="Idag i korthet">
            <div className="space-y-3 text-xl">
              <p>
                😴 Sömn:{' '}
                {data.sleep ? (
                  <span className="text-slate-100">{data.sleep.sleep_score} / 100</span>
                ) : (
                  <span className="text-slate-500">Ej registrerad</span>
                )}
              </p>
              <p>
                ⚡ Energi:{' '}
                {data.sleep?.morning_energy_emoji ?? (
                  <span className="text-slate-500">—</span>
                )}
              </p>
              <p>🚕 Taxi: {data.taxi_hours_today_display}</p>
              <p className="text-base text-slate-400">
                🛠 Loggat: {formatHours(data.logged_hours_today)}
              </p>
              {data.tonight_focus.length > 0 && (
                <div>
                  <p className="text-slate-300">Ikväll:</p>
                  <ul className="mt-1 space-y-1 pl-1 text-lg text-slate-100">
                    {data.tonight_focus.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TeslaSection>

          <TeslaSection>
            {!data.taxi_timer.active ? (
              <div className="text-center">
                <p className="mb-4 text-lg text-slate-400">🚕 Taxi Pass</p>
                <TeslaButton onClick={startTaxi}>▶ Start Taxi Pass</TeslaButton>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-lg text-slate-400">🚕 Taxi Pass</p>
                <p className="my-4 font-mono text-5xl tracking-wider text-teal-300">
                  {formatDurationHms(elapsed)}
                </p>
                {timerPaused && (
                  <p className="mb-3 text-sm text-amber-300/80">Pausad</p>
                )}
                <div className="flex gap-3">
                  <TeslaButton onClick={togglePause} variant="secondary">
                    {timerPaused ? '▶ Fortsätt' : '⏸ Paus'}
                  </TeslaButton>
                  <TeslaButton onClick={stopTaxi} variant="danger">
                    ⏹ Stopp
                  </TeslaButton>
                </div>
              </div>
            )}
          </TeslaSection>

          <TeslaSection title="Snabb sömn">
            {sleepSaved && (
              <p className="mb-3 text-teal-300">✓ Sömn sparad</p>
            )}
            {!showSleepForm && data.sleep && (
              <p className="mb-3 text-lg text-slate-300">
                Poäng {data.sleep.sleep_score} · Energi {data.sleep.morning_energy_emoji}
              </p>
            )}
            {!showSleepForm ? (
              <TeslaButton onClick={() => setShowSleepForm(true)} variant="secondary">
                😴 {data.sleep ? 'Uppdatera sömn' : 'Lägg till sömn'}
              </TeslaButton>
            ) : (
              <div>
                <div className="mb-3 grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs text-slate-500">Sömnpoäng</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={sleepForm.sleep_score}
                      onChange={(e) => setSleepForm({ ...sleepForm, sleep_score: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-lg outline-none focus:border-teal-500"
                      placeholder="76"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-slate-500">Sovtid</span>
                    <input
                      value={sleepForm.actual_sleep}
                      onChange={(e) => setSleepForm({ ...sleepForm, actual_sleep: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-lg outline-none focus:border-teal-500"
                      placeholder="08:07"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-slate-500">Djupsömn</span>
                    <input
                      value={sleepForm.deep_sleep}
                      onChange={(e) => setSleepForm({ ...sleepForm, deep_sleep: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-lg outline-none focus:border-teal-500"
                      placeholder="01:49"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-slate-500">REM</span>
                    <input
                      value={sleepForm.rem_sleep}
                      onChange={(e) => setSleepForm({ ...sleepForm, rem_sleep: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-lg outline-none focus:border-teal-500"
                      placeholder="01:39"
                    />
                  </label>
                </div>
                <p className="mb-2 text-xs text-slate-500">Hur känner du dig?</p>
                <div className="mb-4 flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSleepForm({ ...sleepForm, morning_energy: level })}
                      className={`min-h-12 flex-1 rounded-xl border px-2 text-sm transition ${
                        sleepForm.morning_energy === level
                          ? 'border-teal-500 bg-teal-950/50 text-teal-200'
                          : 'border-white/10 bg-black/20 text-slate-300'
                      }`}
                    >
                      {MORNING_ENERGY_LABELS[level].split(' ')[0]}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <TeslaButton onClick={saveSleep} disabled={sleepSaving}>
                    Spara
                  </TeslaButton>
                  <TeslaButton onClick={() => setShowSleepForm(false)} variant="secondary">
                    Avbryt
                  </TeslaButton>
                </div>
              </div>
            )}
          </TeslaSection>

          <TeslaSection title="Ikväll">
            {data.tonight_events.length === 0 ? (
              <p className="text-lg text-slate-500">Inget planerat ikväll.</p>
            ) : (
              <ul className="space-y-2">
                {data.tonight_events.map((event) => (
                  <li key={event.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedEvent(event)}
                      className="flex w-full min-h-14 items-center gap-4 rounded-xl border border-transparent px-3 py-2 text-left text-lg transition hover:border-white/10 hover:bg-white/5"
                    >
                      <span className="w-14 shrink-0 font-mono text-slate-400">{event.time}</span>
                      <span>{event.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </TeslaSection>

          <TeslaSection title="Kvar idag">
            {data.remaining_schedule.length === 0 ? (
              <p className="text-lg text-slate-500">Inget kvar på schemat.</p>
            ) : (
              <ul className="mb-4 space-y-2">
                {data.remaining_schedule.map((event) => (
                  <li key={event.id} className="flex gap-4 text-lg">
                    <span className="w-14 shrink-0 font-mono text-slate-400">{event.time}</span>
                    <span>{event.title}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/kalender"
              className="inline-flex min-h-12 items-center rounded-xl border border-white/15 px-4 text-base text-slate-300 transition hover:bg-white/5"
            >
              Visa fullständig kalender →
            </Link>
          </TeslaSection>

          <TeslaSection title="Livsbild">
            <div className="space-y-5 text-lg">
              <div>
                <p className="mb-2 text-sm uppercase tracking-wide text-slate-500">Denna vecka</p>
                <p>🚕 Taxi: {formatHoursMinutes(data.life_snapshot.week.taxi_hours)}</p>
                <p>🛠 Projekt: {formatHours(data.life_snapshot.week.project_hours)}</p>
                <p>
                  😴 Sömn:{' '}
                  {data.life_snapshot.week.avg_sleep_score ?? '—'}
                  {data.life_snapshot.week.avg_sleep_score ? ' snitt' : ''}
                </p>
                <p>
                  ⚡ Energi:{' '}
                  {data.life_snapshot.week.avg_energy?.toFixed(1) ?? '—'}
                </p>
              </div>
              <div>
                <p className="mb-2 text-sm uppercase tracking-wide text-slate-500">Denna månad</p>
                <p>🚕 Taxi: {formatHoursMinutes(data.life_snapshot.month.taxi_hours)}</p>
                <p>
                  😴 Sömn:{' '}
                  {data.life_snapshot.month.avg_sleep_score ?? '—'}
                  {data.life_snapshot.month.avg_sleep_score ? ' snitt' : ''}
                </p>
              </div>
            </div>
          </TeslaSection>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-[#0b0f14]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg gap-2 p-3">
          <Link
            to="/"
            className="flex min-h-14 flex-1 items-center justify-center rounded-xl border border-white/10 text-base text-slate-300 transition hover:bg-white/5"
          >
            Översikt
          </Link>
          <Link
            to="/kalender"
            className="flex min-h-14 flex-1 items-center justify-center rounded-xl border border-white/10 text-base text-slate-300 transition hover:bg-white/5"
          >
            Kalender
          </Link>
          <Link
            to="/"
            className="flex min-h-14 flex-1 items-center justify-center rounded-xl bg-teal-900/40 text-base text-teal-200 transition hover:bg-teal-900/60"
          >
            Full My Life
          </Link>
        </div>
      </nav>

      {selectedEvent && (
        <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}
