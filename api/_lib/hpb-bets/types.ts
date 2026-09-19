export const HPB_FIXED_STAKE_SEK = 1000;
export const HPB_SEASON_ID = "hpb-season-2026-27";

export type HpbBetResult = "win" | "loss" | "pending" | "void";
export type HpbBetTiming = "pregame" | "live";
export type HpbReadGrade = "A" | "B" | "C" | "D";

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
  season_id?: string | null;
  created_at: string;
  match_label: string;
  league?: string | null;
  market: string;
  timing: HpbBetTiming | string;
  pressure_gauge?: 1 | 2 | 3 | 4 | 5 | null;
  read_quality?: HpbReadGrade | null;
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
  [key: string]: unknown;
};

export type HpbSeasonMeta = {
  id: string;
  label: string;
  kind?: string;
  status?: string;
  startingBankroll?: number;
  startedAt?: string | null;
  endedAt?: string | null;
};

export type HpbSeasonFile = {
  version: number;
  season: HpbSeasonMeta;
  startingBankroll: number;
  bets: HpbBet[];
  lastUpdated: string | null;
};

export type HpbResultStats = {
  totalProfit: number;
  winRate: number;
  averageOdds: number;
  averageReadQuality: number | null;
  wins: number;
  losses: number;
  pending: number;
  voids: number;
  totalBets: number;
};

export type HpbSettleInput = {
  result: "win" | "loss" | "void";
  actual_score?: string | null;
  notes?: string | null;
  read_quality_score?: 1 | 2 | 3 | 4 | 5 | null;
  payout_sek?: number | null;
};

export type ResultFilter = "all" | "win" | "loss" | "pending" | "void";
export type TimingFilter = "all" | "pregame" | "live";
export type PressureFilter = "all" | "1" | "2" | "3" | "4" | "5";
export type HpbSortKey =
  | "newest"
  | "oldest"
  | "highest_odds"
  | "lowest_odds"
  | "highest_pnl"
  | "lowest_pnl";
