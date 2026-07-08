import { useEffect, useState } from 'react';
import { sleepCheckinApi, sleepImportApi } from '../api';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { MorningSleepCheckIn } from '../components/sleep/MorningSleepCheckIn';
import { SleepScreenshotImporter } from '../components/sleep/SleepScreenshotImporter';
import { SamsungSleepImporter } from '../components/sleep/SamsungSleepImporter';
import { MORNING_ENERGY_EMOJI } from '../lib/constants';
import { formatDate, formatSleepDuration } from '../lib/format';
import type { DailySleepCheckin, MorningReadiness, SleepSessionRecord } from '../types';

export function SleepPage() {
  const [checkins, setCheckins] = useState<DailySleepCheckin[]>([]);
  const [todayCheckin, setTodayCheckin] = useState<DailySleepCheckin | null>(null);
  const [sessions, setSessions] = useState<SleepSessionRecord[]>([]);
  const [lastReadiness, setLastReadiness] = useState<MorningReadiness | null>(null);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [showSamsungImporter, setShowSamsungImporter] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const load = async () => {
    const [today, history, importedSessions] = await Promise.all([
      sleepCheckinApi.today(),
      sleepCheckinApi.list(),
      sleepImportApi.sessions(),
    ]);
    setTodayCheckin(today);
    setCheckins(history);
    setSessions(importedSessions);
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  return (
    <div>
      <PageHeader
        title="Sömn"
        subtitle="Snabb morgoncheck-in från Samsung Health — under 20 sekunder"
        action={
          <Button onClick={() => setShowCheckIn(true)}>Lägg till sömn</Button>
        }
      />

      {lastReadiness && (
        <div className="mb-6 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3">
          <p className="font-medium">
            {lastReadiness.emoji} {lastReadiness.label}
          </p>
          <p className="text-sm text-text-muted">
            Morgonberedskap {lastReadiness.score}/100 — personlig indikator, inte medicinsk rådgivning.
          </p>
        </div>
      )}

      {todayCheckin && (
        <Card title="Dagens sömn" className="mb-6">
          <div className="space-y-1 text-sm">
            <p>😴 Sömnpoäng: {todayCheckin.sleep_score}</p>
            <p>🛌 Sovtid: {formatSleepDuration(todayCheckin.actual_sleep_minutes)}</p>
            <p>💪 Djupsömn: {formatSleepDuration(todayCheckin.deep_sleep_minutes)}</p>
            <p>🧠 REM: {formatSleepDuration(todayCheckin.rem_sleep_minutes)}</p>
            <p>
              ⚡ Energi: {MORNING_ENERGY_EMOJI[todayCheckin.morning_energy] ?? todayCheckin.morning_energy}
            </p>
            {todayCheckin.morning_readiness_label && (
              <p className="mt-2 text-text-muted">{todayCheckin.morning_readiness_label}</p>
            )}
          </div>
          <Button variant="secondary" className="mt-3" onClick={() => setShowCheckIn(true)}>
            Uppdatera
          </Button>
        </Card>
      )}

      <Card title="Historik" className="mb-6">
        {checkins.length === 0 ? (
          <EmptyState message="Ingen sömn registrerad ännu. Klicka Lägg till sömn för att börja." />
        ) : (
          <ul className="divide-y divide-border">
            {checkins.map((checkin) => (
              <li key={checkin.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium">{formatDate(checkin.date)}</p>
                  <p className="text-text-muted">
                    Poäng {checkin.sleep_score} · {formatSleepDuration(checkin.actual_sleep_minutes)}
                  </p>
                </div>
                <div className="text-right text-text-muted">
                  {MORNING_ENERGY_EMOJI[checkin.morning_energy]}
                  {checkin.morning_readiness_label && (
                    <p className="text-xs">{checkin.morning_readiness_label}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Avancerat" className="mb-6">
        <p className="mb-3 text-sm text-text-muted">
          OCR-import för tillfället valfritt — manuell check-in rekommenderas för daglig vana.
        </p>
        <Button variant="ghost" onClick={() => setShowAdvanced((value) => !value)}>
          {showAdvanced ? 'Dölj import' : 'Visa import'}
        </Button>
        {showAdvanced && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setShowSamsungImporter(true)}>
              Importera Samsung-sömn
            </Button>
            <Button variant="ghost" onClick={() => setShowImporter(true)}>
              Importera sömnbild
            </Button>
          </div>
        )}
      </Card>

      {showAdvanced && sessions.length > 0 && (
        <Card title="Importerade sömnsessioner" className="mb-6">
          <ul className="divide-y divide-border">
            {sessions.map((session) => (
              <li key={session.id} className="py-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{formatDate(session.date)}</p>
                    <p className="text-text-muted">
                      {session.source && `${session.source} · `}
                      {session.bedtime && `Läggtid ${session.bedtime}`}
                      {session.wake_time && ` · Uppvakning ${session.wake_time}`}
                    </p>
                  </div>
                  <div className="text-right text-text-muted">
                    {session.actual_sleep_minutes && (
                      <p>{formatSleepDuration(session.actual_sleep_minutes)}</p>
                    )}
                    {session.sleep_score && <p>Poäng {session.sleep_score}</p>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {showCheckIn && (
        <MorningSleepCheckIn
          existing={todayCheckin}
          onSaved={(readiness) => {
            setLastReadiness(readiness);
            setShowCheckIn(false);
            load();
          }}
          onClose={() => setShowCheckIn(false)}
        />
      )}

      {showSamsungImporter && (
        <SamsungSleepImporter
          onSaved={() => load()}
          onClose={() => setShowSamsungImporter(false)}
        />
      )}

      {showImporter && (
        <SleepScreenshotImporter onSaved={load} onClose={() => setShowImporter(false)} />
      )}
    </div>
  );
}
