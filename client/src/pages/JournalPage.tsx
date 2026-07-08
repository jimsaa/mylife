import { useEffect, useState } from 'react';
import { journalApi } from '../api';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Input';
import { formatDate, todayIso } from '../lib/format';
import type { DailyNote } from '../types';

export function JournalPage() {
  const [date] = useState(todayIso());
  const [journalText, setJournalText] = useState('');
  const [reflectionText, setReflectionText] = useState('');
  const [history, setHistory] = useState<DailyNote[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    journalApi.get(date).then((note) => {
      if (note) {
        setJournalText(note.journal_text ?? '');
        setReflectionText(note.reflection_text ?? '');
      }
    });
    journalApi.list().then(setHistory).catch(console.error);
  }, [date]);

  const save = async () => {
    setSaving(true);
    try {
      await journalApi.save(date, {
        journal_text: journalText,
        reflection_text: reflectionText,
      });
      const updated = await journalApi.list();
      setHistory(updated);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Journal" subtitle={formatDate(date)} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Vad gjorde jag idag?">
          <Textarea
            value={journalText}
            onChange={(e) => setJournalText(e.target.value)}
            placeholder="Skriv fritt om dagen..."
            className="min-h-40"
          />
        </Card>

        <Card title="Hur mår jag idag?">
          <Textarea
            value={reflectionText}
            onChange={(e) => setReflectionText(e.target.value)}
            placeholder="Reflektera över humör, energi och känslor..."
            className="min-h-40"
          />
        </Card>
      </div>

      <Button className="mt-4" onClick={save} disabled={saving}>
        Spara journal
      </Button>

      <Card title="Historik" className="mt-6">
        <ul className="divide-y divide-border">
          {history.map((note) => (
            <li key={note.id} className="py-3">
              <p className="text-sm font-medium">{formatDate(note.date)}</p>
              {note.journal_text && (
                <p className="mt-1 text-sm text-text-muted line-clamp-2">{note.journal_text}</p>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
