/**
 * Durable project-cards store for Vercel serverless.
 * Uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set.
 * Falls back to a local JSON file for `vercel dev` / offline.
 */
import { access, mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { list, put } from '@vercel/blob';

export interface StoredProjectCard {
  id: number;
  title: string;
  description: string | null;
  url: string;
  active: number;
  sort_order: number;
  mime_type: string;
  image_base64: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectCardDto {
  id: number;
  title: string;
  description: string | null;
  image_path: string;
  image_url: string;
  url: string;
  active: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface Manifest {
  nextId: number;
  cards: StoredProjectCard[];
}

const MANIFEST_PATHNAME = 'project-cards/manifest.json';
const LOCAL_FALLBACK = path.join(process.cwd(), 'data', 'project-cards-vercel.json');

function emptyManifest(): Manifest {
  return { nextId: 1, cards: [] };
}

function nowIso(): string {
  return new Date().toISOString();
}

export function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function toDto(card: StoredProjectCard, imageBase: string): ProjectCardDto {
  return {
    id: card.id,
    title: card.title,
    description: card.description,
    image_path: `blob:${card.id}`,
    image_url: `${imageBase}/${card.id}`,
    url: card.url,
    active: card.active,
    sort_order: card.sort_order,
    created_at: card.created_at,
    updated_at: card.updated_at,
  };
}

async function readLocalManifest(): Promise<Manifest> {
  try {
    await access(LOCAL_FALLBACK);
    const raw = await readFile(LOCAL_FALLBACK, 'utf8');
    const parsed = JSON.parse(raw) as Manifest;
    if (!parsed || !Array.isArray(parsed.cards)) return emptyManifest();
    return {
      nextId: Number(parsed.nextId) || 1,
      cards: parsed.cards,
    };
  } catch {
    return emptyManifest();
  }
}

async function writeLocalManifest(manifest: Manifest): Promise<void> {
  await mkdir(path.dirname(LOCAL_FALLBACK), { recursive: true });
  await writeFile(LOCAL_FALLBACK, JSON.stringify(manifest, null, 2), 'utf8');
}

async function readBlobManifest(): Promise<Manifest> {
  const { blobs } = await list({ prefix: MANIFEST_PATHNAME, limit: 1 });
  const hit = blobs.find((b) => b.pathname === MANIFEST_PATHNAME) ?? blobs[0];
  if (!hit?.url) return emptyManifest();

  const res = await fetch(hit.url);
  if (!res.ok) return emptyManifest();
  const parsed = (await res.json()) as Manifest;
  if (!parsed || !Array.isArray(parsed.cards)) return emptyManifest();
  return {
    nextId: Number(parsed.nextId) || 1,
    cards: parsed.cards,
  };
}

async function writeBlobManifest(manifest: Manifest): Promise<void> {
  await put(MANIFEST_PATHNAME, JSON.stringify(manifest), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
    allowOverwrite: true,
  });
}

export async function loadManifest(): Promise<Manifest> {
  if (blobConfigured()) return readBlobManifest();
  return readLocalManifest();
}

async function saveManifest(manifest: Manifest): Promise<void> {
  if (blobConfigured()) {
    await writeBlobManifest(manifest);
    return;
  }
  // Local / vercel-dev fallback only — not durable across Vercel serverless instances.
  if (process.env.VERCEL) {
    throw new Error(
      'Project cards storage is not configured on Vercel. Create a Blob store in the Vercel dashboard (Storage → Blob) so BLOB_READ_WRITE_TOKEN is set.',
    );
  }
  await writeLocalManifest(manifest);
}

export async function listCards(opts: {
  activeOnly: boolean;
  imageBase: string;
}): Promise<ProjectCardDto[]> {
  const manifest = await loadManifest();
  const cards = opts.activeOnly
    ? manifest.cards.filter((c) => c.active === 1)
    : [...manifest.cards];
  cards.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  return cards.map((c) => toDto(c, opts.imageBase));
}

export async function getStoredCard(id: number): Promise<StoredProjectCard | null> {
  const manifest = await loadManifest();
  return manifest.cards.find((c) => c.id === id) ?? null;
}

export async function createCard(input: {
  title: string;
  description?: string | null;
  url: string;
  active?: boolean;
  sort_order?: number;
  image_base64: string;
  mime_type: string;
}): Promise<ProjectCardDto> {
  const title = input.title.trim();
  const url = input.url.trim();
  if (!title) throw new Error('title is required');
  if (!url) throw new Error('url is required');
  if (!input.image_base64 || !input.mime_type) {
    throw new Error('image_base64 and mime_type are required');
  }

  const manifest = await loadManifest();
  const ts = nowIso();
  const card: StoredProjectCard = {
    id: manifest.nextId,
    title,
    description: input.description?.trim() || null,
    url,
    active: input.active === false ? 0 : 1,
    sort_order: input.sort_order ?? 0,
    mime_type: input.mime_type,
    image_base64: input.image_base64,
    created_at: ts,
    updated_at: ts,
  };
  manifest.nextId += 1;
  manifest.cards.push(card);
  await saveManifest(manifest);
  return toDto(card, '/api/admin/project-cards/image');
}

export async function updateCard(
  id: number,
  input: {
    title?: string;
    description?: string | null;
    url?: string;
    active?: boolean;
    sort_order?: number;
    image_base64?: string;
    mime_type?: string;
  },
): Promise<ProjectCardDto | null> {
  const manifest = await loadManifest();
  const idx = manifest.cards.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  const existing = manifest.cards[idx];
  const next: StoredProjectCard = {
    ...existing,
    title: input.title !== undefined ? input.title.trim() : existing.title,
    description:
      input.description !== undefined
        ? input.description?.trim() || null
        : existing.description,
    url: input.url !== undefined ? input.url.trim() : existing.url,
    active: input.active !== undefined ? (input.active ? 1 : 0) : existing.active,
    sort_order: input.sort_order !== undefined ? input.sort_order : existing.sort_order,
    updated_at: nowIso(),
  };

  if (input.image_base64 && input.mime_type) {
    next.image_base64 = input.image_base64;
    next.mime_type = input.mime_type;
  }

  if (!next.title) throw new Error('title is required');
  if (!next.url) throw new Error('url is required');

  manifest.cards[idx] = next;
  await saveManifest(manifest);
  return toDto(next, '/api/admin/project-cards/image');
}

export async function deleteCard(id: number): Promise<boolean> {
  const manifest = await loadManifest();
  const before = manifest.cards.length;
  manifest.cards = manifest.cards.filter((c) => c.id !== id);
  if (manifest.cards.length === before) return false;
  await saveManifest(manifest);
  return true;
}
