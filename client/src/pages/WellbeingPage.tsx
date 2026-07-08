import { useEffect, useState } from 'react';
import { wellbeingApi } from '../api';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Input';
import { ScaleSelector } from '../components/ui/ScaleSelector';
import { ENERGY_LABELS, MOOD_LABELS, STRESS_LABELS } from '../lib/constants';
import { formatDate, todayIso } from '../lib/format';

export function WellbeingPage() {
  const [date] = useState(todayIso());
  const [energy, setEnergy] = useState<number | null>(null);
  const [mood, setMood] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    wellbeingApi.get(date).then((data) => {
      if (data) {
        setEnergy(data.energy_level);
        setMood(data.mood_level);
        setStress(data.stress_level);
        setNotes(data.notes ?? '');
      }
    });
  }, [date]);

  const save = async () => {
    setSaving(true);
    try {
      await wellbeingApi.save(date, {
        energy_level: energy,
        mood_level: mood,
        stress_level: stress,
        notes,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Välbefinnande"
        subtitle={`Daglig check-in · ${formatDate(date)}`}
      />

      <div className="grid gap-4">
        <Card title="Energinivå">
          <ScaleSelector value={energy} onChange={setEnergy} labels={ENERGY_LABELS} />
        </Card>
        <Card title="Humör">
          <ScaleSelector value={mood} onChange={setMood} labels={MOOD_LABELS} />
        </Card>
        <Card title="Stress">
          <ScaleSelector value={stress} onChange={setStress} labels={STRESS_LABELS} />
        </Card>
        <Card title="Anteckningar">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Valfria anteckningar..."
          />
        </Card>
      </div>

      <Button className="mt-4" onClick={save} disabled={saving}>
        Spara check-in
      </Button>
    </div>
  );
}
