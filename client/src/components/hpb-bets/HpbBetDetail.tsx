import { useState } from 'react';
import { hpbBetsApi } from '../../api';
import { Button } from '../ui/Button';
import { Field, Input, Select, Textarea } from '../ui/Input';
import {
  betNumberOf,
  calculatePayout,
  calculatePnl,
  formatDate,
  formatOdds,
  formatSek,
  marketLabel,
  pnlClass,
  readQualityScore,
  resultClass,
  resultLabel,
  timingLabel,
  type HpbBet,
} from '../../lib/hpb-bets/display';

type Props = {
  bet: HpbBet;
  onBack: () => void;
  onSettled: (bets: HpbBet[]) => void;
};

export function HpbBetDetail({ bet, onBack, onSettled }: Props) {
  const pending = bet.result === 'pending';
  const [result, setResult] = useState<'win' | 'loss' | 'void'>(pending ? 'win' : bet.result === 'pending' ? 'win' : bet.result);
  const [score, setScore] = useState(bet.actual_score ?? '');
  const [notes, setNotes] = useState(bet.notes ?? '');
  const [readScore, setReadScore] = useState(readQualityScore(bet)?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewPnl = pending ? calculatePnl(bet.stake, bet.odds_decimal, result) : bet.pnl;
  const previewPayout = pending
    ? calculatePayout(bet.stake, bet.odds_decimal, result)
    : bet.payout_sek;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = await hpbBetsApi.settle(betNumberOf(bet), {
        result,
        actual_score: score.trim() || null,
        notes,
        read_quality_score: readScore ? (Number(readScore) as 1 | 2 | 3 | 4 | 5) : undefined,
      });
      onSettled(payload.bets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save result.');
    } finally {
      setSaving(false);
    }
  }

  const rows: { label: string; value: string }[] = [
    { label: 'Bet ID', value: `#${betNumberOf(bet)}` },
    { label: 'Date', value: formatDate(bet.created_at) },
    { label: 'Match', value: bet.match_label },
    { label: 'Market', value: bet.bet_description || marketLabel(bet.market) },
    { label: 'Market category', value: marketLabel(bet.market) },
    { label: 'Timing', value: timingLabel(bet.timing) },
    { label: 'Odds', value: formatOdds(bet.odds_decimal) },
    { label: 'Stake', value: `${bet.stake.toLocaleString('sv-SE')} SEK` },
    { label: 'Result', value: resultLabel(bet.result) },
    {
      label: 'P/L',
      value: bet.pnl == null ? '—' : `${formatSek(bet.pnl)} SEK`,
    },
    {
      label: 'Payout',
      value: bet.payout_sek == null ? '—' : `${bet.payout_sek.toLocaleString('sv-SE')} SEK`,
    },
    {
      label: 'Read Quality',
      value: readQualityScore(bet) != null ? `${readQualityScore(bet)}/5` : '—',
    },
    { label: 'Bet type', value: bet.bet_type || '—' },
    { label: 'Leg count', value: bet.legs?.length != null ? String(bet.legs.length) : '—' },
    { label: 'Final score', value: bet.actual_score || '—' },
    { label: 'Notes', value: bet.notes || '—' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${resultClass(bet.result)}`}>
          {resultLabel(bet.result)}
        </span>
      </div>

      <div>
        <p className="text-sm text-text-muted">#{betNumberOf(bet)}</p>
        <h2 className="text-xl font-semibold text-text">{bet.match_label}</h2>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="rounded-lg border border-border bg-surface-muted/60 px-3 py-2">
            <dt className="text-[11px] uppercase tracking-wide text-text-muted">{row.label}</dt>
            <dd className="mt-0.5 text-sm text-text whitespace-pre-wrap break-words">{row.value}</dd>
          </div>
        ))}
      </dl>

      {bet.legs && bet.legs.length > 0 ? (
        <div className="rounded-xl border border-border bg-surface p-3">
          <h3 className="mb-2 text-sm font-semibold text-text">Legs</h3>
          <ul className="space-y-2">
            {bet.legs.map((leg) => (
              <li key={leg.index} className="rounded-lg bg-surface-muted px-3 py-2 text-sm">
                <p className="font-medium text-text">
                  {leg.index}. {leg.match || bet.match_label}
                </p>
                <p className="text-text-muted">
                  {leg.market || '—'}
                  {leg.odds != null ? ` @ ${formatOdds(leg.odds)}` : ''}
                  {leg.result ? ` · ${resultLabel(leg.result)}` : ''}
                  {leg.final_score ? ` · ${leg.final_score}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {pending ? (
        <form
          className="rounded-xl border border-border bg-surface p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <h3 className="mb-3 text-sm font-semibold text-text">Update pending result</h3>
          <div className="mb-3 flex flex-wrap gap-2">
            {(['win', 'loss', 'void'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setResult(option)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize ${
                  result === option ? 'bg-teal-50 text-accent' : 'border border-border text-text-muted'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <Field label="Final score">
            <Input value={score} onChange={(e) => setScore(e.target.value)} placeholder="2-1" />
          </Field>
          <Field label="Read Quality">
            <Select value={readScore} onChange={(e) => setReadScore(e.target.value)}>
              <option value="">Not set</option>
              <option value="5">5</option>
              <option value="4">4</option>
              <option value="3">3</option>
              <option value="2">2</option>
              <option value="1">1</option>
            </Select>
          </Field>
          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-text-muted">Payout (auto)</p>
              <p className="font-semibold">{previewPayout == null ? '—' : `${previewPayout.toLocaleString('sv-SE')} SEK`}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">P/L (auto)</p>
              <p className={`font-semibold ${pnlClass(previewPnl)}`}>
                {previewPnl == null ? '—' : `${formatSek(previewPnl)} SEK`}
              </p>
            </div>
          </div>
          {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save result'}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
