import {
  applyRunningBankroll,
  betNumberOf,
  computeResultStats,
  settleBetRecord,
} from "./calculations";
import { loadHpbSeasonFile, saveHpbSeasonFile } from "./store";
import type { HpbBet, HpbResultStats, HpbSeasonFile, HpbSettleInput } from "./types";

export type HpbBetsPayload = {
  seasonId: string;
  startingBankroll: number;
  bets: HpbBet[];
  stats: HpbResultStats;
};

export class HpbBetsError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function toPayload(file: HpbSeasonFile): HpbBetsPayload {
  const bets = applyRunningBankroll(file.bets, file.startingBankroll ?? 1000);
  return {
    seasonId: file.season?.id ?? "hpb-season-2026-27",
    startingBankroll: file.startingBankroll ?? 1000,
    bets,
    stats: computeResultStats(bets),
  };
}

export async function loadHpbBets(cwd = process.cwd()): Promise<HpbBetsPayload> {
  return toPayload(await loadHpbSeasonFile(cwd));
}

export function findBet(bets: HpbBet[], betNumber: number): HpbBet | undefined {
  return bets.find((bet) => betNumberOf(bet) === betNumber);
}

export async function settlePendingBet(
  betNumber: number,
  input: HpbSettleInput,
  cwd = process.cwd()
): Promise<{ payload: HpbBetsPayload; bet: HpbBet }> {
  const file = await loadHpbSeasonFile(cwd);
  const existing = findBet(file.bets, betNumber);
  if (!existing) {
    throw new HpbBetsError(404, `Bet #${betNumber} was not found.`);
  }
  if (existing.result !== "pending") {
    throw new HpbBetsError(
      409,
      `Bet #${betNumber} is already ${existing.result}. Settled results are not changed from Results.`
    );
  }

  const settled = settleBetRecord(existing, input);
  const bets = file.bets.map((bet) => (betNumberOf(bet) === betNumber ? settled : bet));
  const next: HpbSeasonFile = {
    ...file,
    bets: applyRunningBankroll(bets, file.startingBankroll ?? 1000),
  };
  await saveHpbSeasonFile(next, cwd);
  const payload = toPayload(next);
  const bet = findBet(payload.bets, betNumber);
  if (!bet) {
    throw new HpbBetsError(500, `Bet #${betNumber} could not be reloaded after save.`);
  }
  return { payload, bet };
}
