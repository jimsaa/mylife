/**
 * Durable TaxiLog store for Vercel serverless (Blob) and local fallback JSON.
 * Calculation logic is reused from the ported TaxiLog modules.
 */
import { access, mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { list, put } from '@vercel/blob';
import { calculateAccruedSalary } from '../../server/src/lib/taxilog/calculations/payroll';
import { calculateDailyFinancials } from '../../server/src/lib/taxilog/data/dailyFinancials';
import { parseTaxiLogImport } from '../../server/src/lib/taxilog/import/taxilogImport';
import {
  buildDailyExportFromState,
  emptyTaxiLogState,
  loadDailyLogFromState,
  loadMonthOverviewFromState,
  recordSalaryPaymentInState,
  saveDailyLogToState,
  seedRealTaxiLogData,
  type DailyLogInput,
  type TaxiLogState,
} from '../../server/src/lib/taxilog/service';

const BLOB_PATH = 'taxi-log/state.json';
const LOCAL_FALLBACK = path.join(process.cwd(), 'data', 'taxi-log-vercel.json');

function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readLocal(): Promise<TaxiLogState> {
  try {
    await access(LOCAL_FALLBACK);
    const parsed = JSON.parse(await readFile(LOCAL_FALLBACK, 'utf8')) as TaxiLogState;
    if (!parsed || !Array.isArray(parsed.workDays)) return emptyTaxiLogState();
    return parsed;
  } catch {
    return emptyTaxiLogState();
  }
}

async function writeLocal(state: TaxiLogState): Promise<void> {
  await mkdir(path.dirname(LOCAL_FALLBACK), { recursive: true });
  await writeFile(LOCAL_FALLBACK, JSON.stringify(state, null, 2), 'utf8');
}

async function readBlob(): Promise<TaxiLogState> {
  const { blobs } = await list({ prefix: BLOB_PATH, limit: 1 });
  const hit = blobs.find((item) => item.pathname === BLOB_PATH) ?? blobs[0];
  if (!hit?.url) return emptyTaxiLogState();
  const res = await fetch(hit.url);
  if (!res.ok) return emptyTaxiLogState();
  const parsed = (await res.json()) as TaxiLogState;
  if (!parsed || !Array.isArray(parsed.workDays)) return emptyTaxiLogState();
  return parsed;
}

async function writeBlob(state: TaxiLogState): Promise<void> {
  await put(BLOB_PATH, JSON.stringify(state), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
    allowOverwrite: true,
  });
}

async function loadState(): Promise<TaxiLogState> {
  const raw = blobConfigured() ? await readBlob() : await readLocal();
  return seedRealTaxiLogData(raw);
}

async function saveState(state: TaxiLogState): Promise<void> {
  if (blobConfigured()) {
    await writeBlob(state);
    return;
  }
  if (process.env.VERCEL) {
    throw new Error(
      'TaxiLog storage is not configured on Vercel. Create a Blob store so BLOB_READ_WRITE_TOKEN is set.',
    );
  }
  await writeLocal(state);
}

export async function getMonth(year: number, month: number) {
  const state = await loadState();
  if (state.workDays.length > 0 && !(await hasPersisted())) {
    await saveState(state);
  }
  return loadMonthOverviewFromState(state, year, month);
}

async function hasPersisted(): Promise<boolean> {
  if (blobConfigured()) {
    const { blobs } = await list({ prefix: BLOB_PATH, limit: 1 });
    return blobs.length > 0;
  }
  try {
    await access(LOCAL_FALLBACK);
    return true;
  } catch {
    return false;
  }
}

export async function getDay(date: string) {
  const state = await loadState();
  return {
    day: loadDailyLogFromState(state, date),
    exportText: buildDailyExportFromState(state, date),
  };
}

export async function parseText(text: string) {
  const parsed = parseTaxiLogImport(text);
  const state = await loadState();
  const preview = calculateDailyFinancials({
    grossIncome: parsed.grossIncome,
    tips: parsed.tips,
    vatRate: state.vatRate,
  });
  return {
    parsed,
    preview: {
      grossIncome: preview.totalIncome.toString(),
      vatAmount: preview.vatAmount.toFixed(2),
      netIncome: preview.incomeExVat.toFixed(2),
      tips: preview.tips.toFixed(2),
      estimatedSalary: calculateAccruedSalary(preview.incomeExVat).toFixed(2),
    },
  };
}

export async function saveDay(input: DailyLogInput) {
  const next = saveDailyLogToState(await loadState(), input);
  await saveState(next);
  return {
    day: loadDailyLogFromState(next, input.date),
    exportText: buildDailyExportFromState(next, input.date),
  };
}

export async function addPayment(input: {
  year: number;
  month: number;
  paymentDate: string;
  amount: string;
  notes?: string | null;
}) {
  const next = recordSalaryPaymentInState(await loadState(), input.year, input.month, input);
  await saveState(next);
  return loadMonthOverviewFromState(next, input.year, input.month);
}
