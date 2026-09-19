import { existsSync } from "node:fs";
import path from "node:path";

const SEASON_FILE = "hpb-season-2026-27.json";
const MIRROR_FILE = "betting-database.json";

function firstExisting(candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return candidate;
  }
  return null;
}

/** Live HPB season JSON when this workspace sits next to HighPressureBets. */
export function resolveHpbSeasonPath(cwd = process.cwd()): string | null {
  const envRoot = process.env.HPB_DATA_ROOT;
  return firstExisting([
    envRoot ? path.join(envRoot, "seasons", SEASON_FILE) : "",
    path.resolve(cwd, "..", "..", "data", "seasons", SEASON_FILE),
    path.resolve(cwd, "..", "data", "seasons", SEASON_FILE),
    path.resolve(cwd, "data", "seasons", SEASON_FILE),
  ]);
}

export function resolveHpbMirrorPath(seasonPath: string | null): string | null {
  if (!seasonPath) return null;
  const dir = path.dirname(seasonPath);
  if (path.basename(dir) === "seasons") {
    return path.join(path.dirname(dir), MIRROR_FILE);
  }
  return null;
}

/** MyLife snapshot used on Vercel / standalone clones. */
export function resolveMyLifeSnapshotPath(cwd = process.cwd()): string {
  const local = path.resolve(cwd, "data", SEASON_FILE);
  const parent = path.resolve(cwd, "..", "data", SEASON_FILE);
  if (existsSync(local) || existsSync(path.dirname(local))) return local;
  if (existsSync(parent) || existsSync(path.dirname(parent))) return parent;
  return local;
}

export function resolveReadableSeasonPath(cwd = process.cwd()): string {
  return resolveHpbSeasonPath(cwd) ?? resolveMyLifeSnapshotPath(cwd);
}
