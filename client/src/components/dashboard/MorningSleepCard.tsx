import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { MORNING_ENERGY_EMOJI } from '../../lib/constants';
import { formatSleepDuration } from '../../lib/format';
import type { DashboardMorningSleep } from '../../types';

interface MorningSleepCardProps {
  sleep: DashboardMorningSleep | null;
  onAddSleep?: () => void;
}

export function MorningSleepCard({ sleep, onAddSleep }: MorningSleepCardProps) {
  return (
    <Card title="Morning Sleep">
      {sleep ? (
        <div className="space-y-1 text-sm">
          <p>😴 Sömnpoäng: {sleep.sleep_score}</p>
          <p>🛌 Sovtid: {formatSleepDuration(sleep.actual_sleep_minutes)}</p>
          <p>💪 Djupsömn: {formatSleepDuration(sleep.deep_sleep_minutes)}</p>
          <p>🧠 REM: {formatSleepDuration(sleep.rem_sleep_minutes)}</p>
          <p>
            ⚡ Energi: {MORNING_ENERGY_EMOJI[sleep.morning_energy] ?? sleep.morning_energy}
          </p>
          {sleep.morning_readiness_label && sleep.morning_readiness_emoji && (
            <p className="mt-2 text-text-muted">
              {sleep.morning_readiness_emoji} {sleep.morning_readiness_label}
            </p>
          )}
        </div>
      ) : (
        <div>
          <EmptyState message="Ingen sömn registrerad idag." />
          {onAddSleep && (
            <Button className="mt-3" onClick={onAddSleep}>
              Lägg till sömn
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
