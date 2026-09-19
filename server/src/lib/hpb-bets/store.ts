import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { applyRunningBankroll } from "./calculations.js";
import {
  resolveHpbMirrorPath,
  resolveHpbSeasonPath,
  resolveMyLifeSnapshotPath,
  resolveReadableSeasonPath,
} from "./paths.js";
import type { HpbSeasonFile } from "./types.js";

const BLOB_PATH = "hpb/season-2026-27.json";

function parseSeason(raw: string): HpbSeasonFile {
  const parsed = JSON.parse(raw) as HpbSeasonFile;
  if (!parsed || !Array.isArray(parsed.bets)) {
    throw new Error("HPB season file is missing bets.");
  }
  return parsed;
}

function withBankroll(file: HpbSeasonFile): HpbSeasonFile {
  return {
    ...file,
    bets: applyRunningBankroll(file.bets, file.startingBankroll ?? 1000),
  };
}

function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readBlob(): Promise<HpbSeasonFile | null> {
  if (!blobConfigured()) return null;
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: BLOB_PATH, limit: 1 });
    const hit = blobs.find((item) => item.pathname === BLOB_PATH) ?? blobs[0];
    if (!hit?.url) return null;
    const res = await fetch(hit.url);
    if (!res.ok) return null;
    return withBankroll(parseSeason(await res.text()));
  } catch {
    return null;
  }
}

async function writeBlob(file: HpbSeasonFile): Promise<void> {
  if (!blobConfigured()) return;
  const { put } = await import("@vercel/blob");
  await put(BLOB_PATH, `${JSON.stringify(file, null, 2)}\n`, {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
    allowOverwrite: true,
  });
}

function readSeasonFromDisk(cwd = process.cwd()): HpbSeasonFile {
  const filePath = resolveReadableSeasonPath(cwd);
  if (!existsSync(filePath)) {
    throw new Error(`HPB season file not found at ${filePath}`);
  }
  return withBankroll(parseSeason(readFileSync(filePath, "utf8")));
}

function writeSeasonToDisk(file: HpbSeasonFile, cwd = process.cwd()): void {
  const body = `${JSON.stringify(file, null, 2)}\n`;
  const hpbPath = resolveHpbSeasonPath(cwd);
  if (hpbPath) {
    writeFileSync(hpbPath, body, "utf8");
    const mirror = resolveHpbMirrorPath(hpbPath);
    if (mirror) {
      const existing = existsSync(mirror)
        ? (JSON.parse(readFileSync(mirror, "utf8")) as Record<string, unknown>)
        : {};
      writeFileSync(
        mirror,
        `${JSON.stringify(
          {
            ...existing,
            version: file.version,
            season: file.season,
            startingBankroll: file.startingBankroll,
            bets: file.bets,
            lastUpdated: file.lastUpdated,
          },
          null,
          2
        )}\n`,
        "utf8"
      );
    }
  }

  const snapshot = resolveMyLifeSnapshotPath(cwd);
  mkdirSync(path.dirname(snapshot), { recursive: true });
  writeFileSync(snapshot, body, "utf8");
}

export async function loadHpbSeasonFile(cwd = process.cwd()): Promise<HpbSeasonFile> {
  const fromBlob = await readBlob();
  if (fromBlob?.bets.length) return fromBlob;
  return readSeasonFromDisk(cwd);
}

export async function saveHpbSeasonFile(file: HpbSeasonFile, cwd = process.cwd()): Promise<void> {
  const next: HpbSeasonFile = {
    ...withBankroll(file),
    lastUpdated: new Date().toISOString(),
  };

  if (blobConfigured()) {
    await writeBlob(next);
    if (!process.env.VERCEL) {
      writeSeasonToDisk(next, cwd);
    }
    return;
  }

  if (process.env.VERCEL) {
    throw new Error(
      "HPB storage is not configured on Vercel. Create a Blob store so BLOB_READ_WRITE_TOKEN is set."
    );
  }

  writeSeasonToDisk(next, cwd);
}
