import { HPB_FIXED_STAKE_SEK } from "./types.js";
import type {
  HpbBet,
  HpbBetResult,
  HpbReadGrade,
  HpbResultStats,
  HpbSettleInput,
  HpbSortKey,
  PressureFilter,
  ResultFilter,
  TimingFilter,
} from "./types.js";

const READ_GRADE_SCORE: Record<HpbReadGrade, number> = {
  A: 5,
  B: 4,
  C: 3,
  D: 2,
};

export function betNumberOf(bet: HpbBet): number {
  if (typeof bet.bet_number === "number" && Number.isFinite(bet.bet_number)) {
    return bet.bet_number;
  }
  const fromId = Number(bet.id);
  return Number.isFinite(fromId) ? fromId : 0;
}

export function calculatePnl(
  stake: number,
  oddsDecimal: number | null,
  result: HpbBetResult
): number {
  if (result === "win") {
    if (oddsDecimal == null) return 0;
    return Number(((oddsDecimal - 1) * stake).toFixed(2));
  }
  if (result === "loss") {
    return Number((-stake).toFixed(2));
  }
  return 0;
}

export function calculatePayout(
  stake: number,
  oddsDecimal: number | null,
  result: HpbBetResult
): number | null {
  if (result === "pending") return null;
  if (result === "loss") return 0;
  if (result === "void") return Number(stake.toFixed(2));
  if (oddsDecimal == null) return 0;
  return Number((stake * oddsDecimal).toFixed(2));
}

export function hpbStake(bet: Pick<HpbBet, "stake">): number {
  return Number.isFinite(bet.stake) && bet.stake > 0 ? bet.stake : HPB_FIXED_STAKE_SEK;
}

export function readQualityScore(bet: HpbBet): number | null {
  if (typeof bet.read_quality_score === "number") return bet.read_quality_score;
  if (bet.read_quality && bet.read_quality in READ_GRADE_SCORE) {
    return READ_GRADE_SCORE[bet.read_quality];
  }
  return null;
}

export function scoreToGrade(score: number): HpbReadGrade | null {
  if (score >= 5) return "A";
  if (score >= 4) return "B";
  if (score >= 3) return "C";
  if (score >= 2) return "D";
  return null;
}

export function sortBetsForSeason(bets: HpbBet[]): HpbBet[] {
  return [...bets].sort((a, b) => {
    const left = betNumberOf(a);
    const right = betNumberOf(b);
    if (left !== right) return left - right;
    return a.created_at.localeCompare(b.created_at);
  });
}

export function applyRunningBankroll(bets: HpbBet[], startingBankroll: number): HpbBet[] {
  let bankroll = startingBankroll;
  return sortBetsForSeason(bets).map((bet) => {
    const stake = hpbStake(bet);
    if (bet.result === "pending") {
      return { ...bet, pnl: null, bankroll_after_bet: null };
    }
    if (bet.result === "void") {
      return { ...bet, pnl: 0, bankroll_after_bet: Number(bankroll.toFixed(2)) };
    }
    const pnl = calculatePnl(stake, bet.odds_decimal, bet.result);
    bankroll = Number((bankroll + pnl).toFixed(2));
    return { ...bet, pnl, bankroll_after_bet: bankroll };
  });
}

export function computeResultStats(bets: HpbBet[]): HpbResultStats {
  const settled = bets.filter((bet) => bet.result === "win" || bet.result === "loss");
  const wins = settled.filter((bet) => bet.result === "win").length;
  const losses = settled.filter((bet) => bet.result === "loss").length;
  const totalProfit = Number(
    settled
      .reduce((sum, bet) => sum + calculatePnl(hpbStake(bet), bet.odds_decimal, bet.result), 0)
      .toFixed(2)
  );
  const oddsValues = settled
    .map((bet) => bet.odds_decimal)
    .filter((odds): odds is number => odds != null && Number.isFinite(odds));
  const averageOdds = oddsValues.length
    ? Number((oddsValues.reduce((sum, odds) => sum + odds, 0) / oddsValues.length).toFixed(2))
    : 0;
  const reads = bets
    .map(readQualityScore)
    .filter((score): score is number => score != null);
  return {
    totalProfit,
    winRate: settled.length ? Number((wins / settled.length).toFixed(4)) : 0,
    averageOdds,
    averageReadQuality: reads.length
      ? Number((reads.reduce((sum, score) => sum + score, 0) / reads.length).toFixed(1))
      : null,
    wins,
    losses,
    pending: bets.filter((bet) => bet.result === "pending").length,
    voids: bets.filter((bet) => bet.result === "void").length,
    totalBets: bets.length,
  };
}

export function matchesSearch(bet: HpbBet, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const betNo = String(betNumberOf(bet));
  return (
    betNo.includes(q) ||
    `#${betNo}`.includes(q) ||
    bet.match_label.toLowerCase().includes(q) ||
    bet.market.toLowerCase().includes(q) ||
    (bet.bet_description ?? "").toLowerCase().includes(q) ||
    (bet.notes ?? "").toLowerCase().includes(q)
  );
}

export function filterBets(
  bets: HpbBet[],
  options: {
    query?: string;
    result?: ResultFilter;
    timing?: TimingFilter;
    pressure?: PressureFilter;
  }
): HpbBet[] {
  return bets.filter((bet) => {
    if (options.query && !matchesSearch(bet, options.query)) return false;
    if (options.result && options.result !== "all" && bet.result !== options.result) return false;
    if (options.timing && options.timing !== "all" && bet.timing !== options.timing) return false;
    if (options.pressure && options.pressure !== "all") {
      if (String(bet.pressure_gauge ?? "") !== options.pressure) return false;
    }
    return true;
  });
}

export function sortBets(bets: HpbBet[], sortBy: HpbSortKey): HpbBet[] {
  const copy = [...bets];
  copy.sort((a, b) => {
    if (sortBy === "newest") return betNumberOf(b) - betNumberOf(a);
    if (sortBy === "oldest") return betNumberOf(a) - betNumberOf(b);
    if (sortBy === "highest_odds") return (b.odds_decimal ?? -Infinity) - (a.odds_decimal ?? -Infinity);
    if (sortBy === "lowest_odds") return (a.odds_decimal ?? Infinity) - (b.odds_decimal ?? Infinity);
    const aPnl = a.pnl ?? calculatePnl(hpbStake(a), a.odds_decimal, a.result);
    const bPnl = b.pnl ?? calculatePnl(hpbStake(b), b.odds_decimal, b.result);
    if (sortBy === "highest_pnl") return bPnl - aPnl;
    return aPnl - bPnl;
  });
  return copy;
}

export function settleBetRecord(bet: HpbBet, input: HpbSettleInput): HpbBet {
  const stake = hpbStake(bet);
  const pnl = calculatePnl(stake, bet.odds_decimal, input.result);
  const payout =
    input.payout_sek != null && Number.isFinite(input.payout_sek)
      ? Number(input.payout_sek.toFixed(2))
      : calculatePayout(stake, bet.odds_decimal, input.result);

  const next: HpbBet = {
    ...bet,
    result: input.result,
    pnl,
    payout_sek: payout,
    stake,
  };

  if (input.actual_score !== undefined) {
    next.actual_score = input.actual_score;
  }
  if (input.notes !== undefined) {
    next.notes = input.notes;
  }
  if (input.read_quality_score != null) {
    next.read_quality_score = input.read_quality_score;
    next.read_quality = scoreToGrade(input.read_quality_score);
  }

  return next;
}
