import { useEffect, useMemo, useState } from 'react';
import { hpbBetsApi } from '../api';
import { HpbBetDetail } from '../components/hpb-bets/HpbBetDetail';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Input, Select } from '../components/ui/Input';
import { StatCard } from '../components/ui/StatCard';
import {
  betNumberOf,
  computeResultStats,
  filterAndSortBets,
  formatOdds,
  formatSek,
  marketLabel,
  pnlClass,
  resultClass,
  resultLabel,
  timingLabel,
  type HpbBet,
  type HpbSortKey,
  type PressureFilter,
  type ResultFilter,
  type TimingFilter,
} from '../lib/hpb-bets/display';

export function HpbBetsResultsPage() {
  const [bets, setBets] = useState<HpbBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
  const [timingFilter, setTimingFilter] = useState<TimingFilter>('all');
  const [pressureFilter, setPressureFilter] = useState<PressureFilter>('all');
  const [sortBy, setSortBy] = useState<HpbSortKey>('newest');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    hpbBetsApi
      .list()
      .then((payload) => {
        if (active) setBets(payload.bets);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load bets.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const visible = useMemo(
    () =>
      filterAndSortBets(bets, {
        query,
        result: resultFilter,
        timing: timingFilter,
        pressure: pressureFilter,
        sortBy,
      }),
    [bets, pressureFilter, query, resultFilter, sortBy, timingFilter],
  );

  const stats = useMemo(() => computeResultStats(visible), [visible]);
  const selected = selectedId ? bets.find((bet) => bet.id === selectedId) ?? null : null;

  if (loading) {
    return <p className="text-sm text-text-muted">Loading results…</p>;
  }
  if (error) {
    return <p className="text-sm text-rose-600">{error}</p>;
  }

  if (selected) {
    return (
      <div>
        <PageHeader title="Results" subtitle="Bets" />
        <Card>
          <HpbBetDetail
            bet={selected}
            onBack={() => setSelectedId(null)}
            onSettled={(next) => {
              setBets(next);
              const updated = next.find((bet) => bet.id === selected.id);
              if (updated) setSelectedId(updated.id);
            }}
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Results" subtitle="Bets · HPB Season 2026/27" />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total Profit"
          value={`${formatSek(stats.totalProfit)} SEK`}
          indicator={stats.totalProfit >= 0 ? 'green' : 'red'}
        />
        <StatCard label="Win Rate" value={`${(stats.winRate * 100).toFixed(1)}%`} />
        <StatCard label="Average Odds" value={stats.averageOdds.toFixed(2)} />
        <StatCard
          label="Average Read Quality"
          value={stats.averageReadQuality == null ? '—' : `${stats.averageReadQuality}/5`}
        />
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_1fr]">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search match, market, bet ID, notes"
          />
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as HpbSortKey)}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="highest_odds">Highest odds</option>
            <option value="lowest_odds">Lowest odds</option>
            <option value="highest_pnl">Highest P/L</option>
            <option value="lowest_pnl">Lowest P/L</option>
          </Select>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(['all', 'win', 'loss', 'pending', 'void'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setResultFilter(option)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${
                resultFilter === option ? 'bg-teal-50 text-accent' : 'border border-border text-text-muted'
              }`}
            >
              {option === 'all' ? 'All' : option}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {(['all', 'pregame', 'live'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTimingFilter(option)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                timingFilter === option ? 'bg-teal-50 text-accent' : 'border border-border text-text-muted'
              }`}
            >
              {option === 'all' ? 'All' : option === 'pregame' ? 'Pre-match' : 'Live'}
            </button>
          ))}
          <Select
            value={pressureFilter}
            onChange={(e) => setPressureFilter(e.target.value as PressureFilter)}
          >
            <option value="all">Pressure: All</option>
            <option value="5">Pressure: Max</option>
            <option value="4">Pressure: High</option>
            <option value="3">Pressure: Rising</option>
            <option value="2">Pressure: Stable</option>
            <option value="1">Pressure: Low</option>
          </Select>
        </div>
      </Card>

      {visible.length === 0 ? (
        <Card>
          <EmptyState message="No bets match the current search or filters." />
        </Card>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-surface md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-surface-muted text-[11px] uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="px-3 py-2">Bet #</th>
                  <th className="px-3 py-2">Match</th>
                  <th className="px-3 py-2">Market</th>
                  <th className="px-3 py-2">Timing</th>
                  <th className="px-3 py-2">Odds</th>
                  <th className="px-3 py-2">Stake</th>
                  <th className="px-3 py-2">Result</th>
                  <th className="px-3 py-2">P/L</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((bet) => (
                  <tr
                    key={bet.id}
                    className="cursor-pointer border-t border-border hover:bg-surface-muted/80"
                    onClick={() => setSelectedId(bet.id)}
                  >
                    <td className="px-3 py-2 font-semibold">#{betNumberOf(bet)}</td>
                    <td className="px-3 py-2">{bet.match_label}</td>
                    <td className="px-3 py-2">{marketLabel(bet.market)}</td>
                    <td className="px-3 py-2">{timingLabel(bet.timing)}</td>
                    <td className="px-3 py-2">{formatOdds(bet.odds_decimal)}</td>
                    <td className="px-3 py-2">{bet.stake.toLocaleString('sv-SE')}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${resultClass(bet.result)}`}>
                        {resultLabel(bet.result)}
                      </span>
                    </td>
                    <td className={`px-3 py-2 font-semibold ${pnlClass(bet.pnl)}`}>
                      {bet.pnl == null ? '—' : formatSek(bet.pnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 md:hidden">
            {visible.map((bet) => (
              <button
                key={bet.id}
                type="button"
                onClick={() => setSelectedId(bet.id)}
                className="w-full rounded-xl border border-border bg-surface p-3 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-text-muted">#{betNumberOf(bet)}</p>
                    <p className="font-medium text-text">{bet.match_label}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${resultClass(bet.result)}`}>
                    {resultLabel(bet.result)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-text-muted">{formatOdds(bet.odds_decimal)}</span>
                  <span className={`font-semibold ${pnlClass(bet.pnl)}`}>
                    {bet.pnl == null ? '—' : formatSek(bet.pnl)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
