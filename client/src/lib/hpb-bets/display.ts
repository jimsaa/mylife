export type HpbBetResult = 'win' | 'loss' | 'pending' | 'void';
export type ResultFilter = 'all' | HpbBetResult;
export type TimingFilter = 'all' | 'pregame' | 'live';
export type PressureFilter = 'all' | '1' | '2' | '3' | '4' | '5';
export type HpbSortKey =
  | 'newest'
  | 'oldest'
  | 'highest_odds'
  | 'lowest_odds'
  | 'highest_pnl'
  | 'lowest_pnl';

export type HpbBetLeg = {
  index: number;
  match?: string | null;
  market?: string | null;
  odds?: number | null;
  result?: HpbBetResult | null;
  final_score?: string | null;
};

export type HpbBet = {
  id: string;
  bet_number?: number | null;
  created_at: string;
  match_label: string;
  market: string;
  timing: string;
  pressure_gauge?: 1 | 2 | 3 | 4 | 5 | null;
  read_quality?: 'A' | 'B' | 'C' | 'D' | null;
  read_quality_score?: 1 | 2 | 3 | 4 | 5 | null;
  stake: number;
  odds_decimal: number | null;
  result: HpbBetResult;
  pnl: number | null;
  notes?: string | null;
  bet_description?: string | null;
  bet_type?: string | null;
  actual_score?: string | null;
  payout_sek?: number | null;
  bankroll_after_bet?: number | null;
  legs?: HpbBetLeg[] | null;
};

export type HpbResultStats = {
  totalProfit: number;
  winRate: number;
  averageOdds: number;
  averageReadQuality: number | null;
};

export const PRESSURE_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Low',
  2: 'Stable',
  3: 'Rising',
  4: 'High',
  5: 'Max',
};

const READ_MAP = { A: 5, B: 4, C: 3, D: 2 } as const;

export function betNumberOf(bet: HpbBet): number {
  if (typeof bet.bet_number === 'number') return bet.bet_number;
  const fromId = Number(bet.id);
  return Number.isFinite(fromId) ? fromId : 0;
}

export function calculatePnl(stake: number, odds: number | null, result: HpbBetResult): number {
  if (result === 'win') {
    if (odds == null) return 0;
    return Number(((odds - 1) * stake).toFixed(2));
  }
  if (result === 'loss') return Number((-stake).toFixed(2));
  return 0;
}

export function calculatePayout(stake: number, odds: number | null, result: HpbBetResult): number | null {
  if (result === 'pending') return null;
  if (result === 'loss') return 0;
  if (result === 'void') return Number(stake.toFixed(2));
  if (odds == null) return 0;
  return Number((stake * odds).toFixed(2));
}

export function readQualityScore(bet: HpbBet): number | null {
  if (typeof bet.read_quality_score === 'number') return bet.read_quality_score;
  if (bet.read_quality && bet.read_quality in READ_MAP) return READ_MAP[bet.read_quality];
  return null;
}

export function computeResultStats(bets: HpbBet[]): HpbResultStats {
  const settled = bets.filter((bet) => bet.result === 'win' || bet.result === 'loss');
  const wins = settled.filter((bet) => bet.result === 'win').length;
  const totalProfit = Number(
    settled.reduce((sum, bet) => sum + calculatePnl(bet.stake, bet.odds_decimal, bet.result), 0).toFixed(2),
  );
  const oddsValues = settled
    .map((bet) => bet.odds_decimal)
    .filter((odds): odds is number => odds != null && Number.isFinite(odds));
  const reads = bets.map(readQualityScore).filter((score): score is number => score != null);
  return {
    totalProfit,
    winRate: settled.length ? wins / settled.length : 0,
    averageOdds: oddsValues.length
      ? Number((oddsValues.reduce((sum, odds) => sum + odds, 0) / oddsValues.length).toFixed(2))
      : 0,
    averageReadQuality: reads.length
      ? Number((reads.reduce((sum, score) => sum + score, 0) / reads.length).toFixed(1))
      : null,
  };
}

export function filterAndSortBets(
  bets: HpbBet[],
  options: {
    query: string;
    result: ResultFilter;
    timing: TimingFilter;
    pressure: PressureFilter;
    sortBy: HpbSortKey;
  },
): HpbBet[] {
  const q = options.query.trim().toLowerCase();
  const filtered = bets.filter((bet) => {
    const n = String(betNumberOf(bet));
    const matchesSearch =
      !q ||
      n.includes(q) ||
      `#${n}`.includes(q) ||
      bet.match_label.toLowerCase().includes(q) ||
      bet.market.toLowerCase().includes(q) ||
      (bet.bet_description ?? '').toLowerCase().includes(q) ||
      (bet.notes ?? '').toLowerCase().includes(q);
    const matchesResult = options.result === 'all' || bet.result === options.result;
    const matchesTiming = options.timing === 'all' || bet.timing === options.timing;
    const matchesPressure =
      options.pressure === 'all' || String(bet.pressure_gauge ?? '') === options.pressure;
    return matchesSearch && matchesResult && matchesTiming && matchesPressure;
  });

  return [...filtered].sort((a, b) => {
    if (options.sortBy === 'newest') return betNumberOf(b) - betNumberOf(a);
    if (options.sortBy === 'oldest') return betNumberOf(a) - betNumberOf(b);
    if (options.sortBy === 'highest_odds') return (b.odds_decimal ?? -Infinity) - (a.odds_decimal ?? -Infinity);
    if (options.sortBy === 'lowest_odds') return (a.odds_decimal ?? Infinity) - (b.odds_decimal ?? Infinity);
    const aPnl = a.pnl ?? calculatePnl(a.stake, a.odds_decimal, a.result);
    const bPnl = b.pnl ?? calculatePnl(b.stake, b.odds_decimal, b.result);
    if (options.sortBy === 'highest_pnl') return bPnl - aPnl;
    return aPnl - bPnl;
  });
}

export function formatSek(value: number): string {
  const signed = value > 0 ? '+' : '';
  return `${signed}${value.toLocaleString('sv-SE', { maximumFractionDigits: 0 })}`;
}

export function formatOdds(odds: number | null | undefined): string {
  if (odds == null || !Number.isFinite(odds)) return '—';
  return odds.toFixed(2);
}

export function marketLabel(market: string): string {
  const labels: Record<string, string> = {
    moneyline: 'Moneyline',
    spread: 'Spread',
    total: 'Total',
    cards: 'Cards',
    corners: 'Corners',
    props: 'Props',
  };
  return labels[market] ?? market;
}

export function timingLabel(timing: string): string {
  if (timing === 'live') return 'Live';
  return 'Pre-match';
}

export function resultLabel(result: HpbBetResult): string {
  if (result === 'win') return 'WIN';
  if (result === 'loss') return 'LOSS';
  if (result === 'void') return 'VOID';
  return 'PENDING';
}

export function resultClass(result: HpbBetResult): string {
  if (result === 'win') return 'bg-emerald-50 text-emerald-700';
  if (result === 'loss') return 'bg-rose-50 text-rose-700';
  if (result === 'void') return 'bg-slate-100 text-slate-600';
  return 'bg-amber-50 text-amber-700';
}

export function pnlClass(value: number | null): string {
  if (value == null) return 'text-text-muted';
  if (value > 0) return 'text-emerald-700';
  if (value < 0) return 'text-rose-700';
  return 'text-text-muted';
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString('sv-SE');
}
