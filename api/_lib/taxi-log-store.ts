/**
 * Durable TaxiLog store for Vercel serverless (Blob) and local fallback JSON.
 * Calculation logic is reused from the ported TaxiLog modules.
 */
import { access, mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { get, list, put, type GetBlobResult } from '@vercel/blob';
import { parseTaxiLogImport } from './taxilog/import/taxilogImport';
import {
  buildDailyExportFromState,
  emptyTaxiLogState,
  loadDailyLogFromState,
  loadMonthOverviewFromState,
  previewImport,
  recordManualSavingsInState,
  recordSalaryPaymentInState,
  saveDailyLogToState,
  seedRealTaxiLogData,
  settleMonthInState,
  unlockMonthInState,
  type DailyLogInput,
  type TaxiLogState,
} from './taxilog/service';

export const TAXI_LOG_BLOB_PATH = 'taxi-log/state.json';
export const TAXI_LOG_BLOB_ACCESS = 'private' as const;

export const TAXI_LOG_BLOB_GET_OPTIONS = {
  access: TAXI_LOG_BLOB_ACCESS,
  useCache: false as const,
};

export const TAXI_LOG_BLOB_PUBLIC_FALLBACK_GET_OPTIONS = {
  access: 'public' as const,
  useCache: false as const,
};

export const TAXI_LOG_BLOB_PUT_OPTIONS = {
  access: TAXI_LOG_BLOB_ACCESS,
  addRandomSuffix: false,
  allowOverwrite: true,
  contentType: 'application/json',
  cacheControlMaxAge: 60,
};

/** Same pathname and overwrite rules. Used only after a public store rejects private access. */
export const TAXI_LOG_BLOB_PUBLIC_PUT_OPTIONS = {
  ...TAXI_LOG_BLOB_PUT_OPTIONS,
  access: 'public' as const,
};

const LOCAL_FALLBACK = path.join(process.cwd(), 'data', 'taxi-log-vercel.json');

export type TaxiLogBlobIO = {
  getPrivate(): Promise<string | null>;
  getPublic(): Promise<string | null>;
  put(body: string, access?: 'private' | 'public'): Promise<unknown>;
  listExists(): Promise<boolean>;
};

export function createMemoryTaxiLogBlobIO(initial?: {
  privateBody?: string | null;
  publicBody?: string | null;
}): TaxiLogBlobIO & {
  privateReads: number;
  publicReads: number;
  listCalls: number;
  puts: string[];
  putAccess: Array<'private' | 'public'>;
  putReturnValue: { url: string; downloadUrl: string };
  listError: Error | null;
  privateBody: string | null;
  publicBody: string | null;
} {
  const io = {
    privateReads: 0,
    publicReads: 0,
    listCalls: 0,
    puts: [] as string[],
    putAccess: [] as Array<'private' | 'public'>,
    listError: null as Error | null,
    privateBody: initial?.privateBody ?? null,
    publicBody: initial?.publicBody ?? null,
    putReturnValue: {
      url: 'https://example.private.blob.vercel-storage.com/taxi-log/state.json',
      downloadUrl: 'https://example.private.blob.vercel-storage.com/taxi-log/state.json?download=1',
    },
    async getPrivate() {
      io.privateReads += 1;
      return io.privateBody;
    },
    async getPublic() {
      io.publicReads += 1;
      return io.publicBody;
    },
    async put(body: string, access: 'private' | 'public' = 'private') {
      io.puts.push(body);
      io.putAccess.push(access);
      io.privateBody = body;
      io.publicBody = access === 'public' ? body : null;
      return io.putReturnValue;
    },
    async listExists() {
      io.listCalls += 1;
      if (io.listError) throw io.listError;
      return io.privateBody != null || io.publicBody != null;
    },
  };
  return io;
}

let testIO: TaxiLogBlobIO | null = null;

export function setTaxiLogBlobIOForTests(io: TaxiLogBlobIO | null): void {
  testIO = io;
}

function blobConfigured(): boolean {
  return testIO != null || Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function streamToText(stream: ReadableStream<Uint8Array>): Promise<string> {
  return new Response(stream).text();
}

export async function textFromBlobGetResult(result: GetBlobResult | null): Promise<string | null> {
  if (result === null) {
    return null;
  }
  if (result.statusCode === 200 && result.stream) {
    return streamToText(result.stream);
  }
  if (result.statusCode === 304) {
    throw new Error('TaxiLog blob GET returned 304 Not Modified.');
  }
  throw new Error('TaxiLog blob GET returned an unusable response.');
}

function parseState(raw: string | null): TaxiLogState {
  if (raw == null || raw.trim() === '') return emptyTaxiLogState();
  try {
    const parsed = JSON.parse(raw) as TaxiLogState;
    if (!parsed || !Array.isArray(parsed.workDays)) return emptyTaxiLogState();
    return parsed;
  } catch {
    return emptyTaxiLogState();
  }
}

async function readSdkBlobText(access: 'private' | 'public'): Promise<string | null> {
  const result = await get(
    TAXI_LOG_BLOB_PATH,
    access === 'private' ? TAXI_LOG_BLOB_GET_OPTIONS : TAXI_LOG_BLOB_PUBLIC_FALLBACK_GET_OPTIONS,
  );
  return textFromBlobGetResult(result);
}

function createDefaultBlobIO(): TaxiLogBlobIO {
  return {
    async getPrivate() {
      return readSdkBlobText('private');
    },
    async getPublic() {
      return readSdkBlobText('public');
    },
    async put(body: string, access: 'private' | 'public' = 'private') {
      await put(
        TAXI_LOG_BLOB_PATH,
        body,
        access === 'public' ? TAXI_LOG_BLOB_PUBLIC_PUT_OPTIONS : TAXI_LOG_BLOB_PUT_OPTIONS,
      );
    },
    async listExists() {
      const { blobs } = await list({ prefix: TAXI_LOG_BLOB_PATH, limit: 1 });
      return blobs.some((item) => item.pathname === TAXI_LOG_BLOB_PATH);
    },
  };
}

function resolveBlobIO(): TaxiLogBlobIO {
  return testIO ?? createDefaultBlobIO();
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

/** A still-public object rejects private GET with HTTP 400. That is not a missing store. */
export function isPublicBlobRejectingPrivateRead(error: unknown): boolean {
  const message = error instanceof Error ? error.message : '';
  return /Failed to fetch blob:\s*400\b/.test(message);
}

/** Blob API rejects private put/get when the store itself is public. */
export function isPublicStoreRejectingPrivateAccess(error: unknown): boolean {
  const message = error instanceof Error ? error.message : '';
  return message.includes('Cannot use private access on a public store');
}

async function readBlob(): Promise<TaxiLogState> {
  const io = resolveBlobIO();
  let privateText: string | null;
  try {
    privateText = await io.getPrivate();
  } catch (error) {
    if (!isPublicBlobRejectingPrivateRead(error) && !isPublicStoreRejectingPrivateAccess(error)) throw error;
    privateText = null;
  }
  if (privateText != null) return parseState(privateText);
  const publicText = await io.getPublic();
  if (publicText != null) return parseState(publicText);
  return emptyTaxiLogState();
}

async function writeBlob(state: TaxiLogState): Promise<void> {
  const body = JSON.stringify(state);
  const io = resolveBlobIO();
  try {
    await io.put(body, 'private');
  } catch (error) {
    if (!isPublicStoreRejectingPrivateAccess(error)) throw error;
    await io.put(body, 'public');
  }
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

async function hasPersisted(): Promise<boolean> {
  if (blobConfigured()) {
    try {
      return await resolveBlobIO().listExists();
    } catch {
      // Fail closed: a list error must not look like an empty store (that would seed/overwrite).
      return true;
    }
  }
  try {
    await access(LOCAL_FALLBACK);
    return true;
  } catch {
    return false;
  }
}

export async function getMonth(year: number, month: number) {
  const state = await loadState();
  try {
    if (state.workDays.length > 0 && !(await hasPersisted())) {
      await saveState(state);
    }
  } catch {
    // Keep the overview readable if Blob is not configured yet.
  }
  return loadMonthOverviewFromState(state, year, month);
}

export async function getDay(date: string) {
  const state = await loadState();
  return {
    day: loadDailyLogFromState(state, date),
    exportText: buildDailyExportFromState(state, date),
  };
}

export async function parseText(text: string) {
  return previewImport(await loadState(), parseTaxiLogImport(text));
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

export async function settleMonth(year: number, month: number) {
  const next = settleMonthInState(await loadState(), year, month);
  await saveState(next);
  return loadMonthOverviewFromState(next, year, month);
}

export async function unlockMonth(year: number, month: number) {
  const next = unlockMonthInState(await loadState(), year, month);
  await saveState(next);
  return loadMonthOverviewFromState(next, year, month);
}

export async function addSavings(input: {
  date: string;
  amount: string;
  kind: 'MANUAL_DEPOSIT' | 'MANUAL_WITHDRAWAL';
  description: string;
}) {
  const next = recordManualSavingsInState(await loadState(), input);
  await saveState(next);
  const [year, month] = input.date.split('-').map(Number);
  return loadMonthOverviewFromState(next, year ?? 0, month ?? 1);
}
