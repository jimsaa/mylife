import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { hasAdminAccess } from '@/lib/auth/permissions';
import {
  createItem,
  getAllAiTools,
  getAllDownloads,
  getAllHooks,
  getAllMonthlyDrops,
  getAllPrograms,
  getAllPrompts,
  getAllVaultUpdates,
} from '@/lib/repositories/content-repository';
import type { ContentCollection } from '@/lib/admin/collections';

const GET_ALL: Record<ContentCollection, () => unknown[]> = {
  prompts: getAllPrompts,
  hooks: getAllHooks,
  ai_tools: getAllAiTools,
  affiliate_programs: getAllPrograms,
  downloads: getAllDownloads,
  vault_updates: getAllVaultUpdates,
  monthly_drops: getAllMonthlyDrops,
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resource: string }> }
) {
  const user = await getServerSession();
  if (!user || !hasAdminAccess(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { resource } = await params;
  const collection = resource as ContentCollection;
  const getter = GET_ALL[collection];
  if (!getter) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ items: getter() });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ resource: string }> }
) {
  const user = await getServerSession();
  if (!user || !hasAdminAccess(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { resource } = await params;
  const collection = resource as ContentCollection;
  if (!GET_ALL[collection]) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();
  const item = createItem(collection, body);
  return NextResponse.json({ item }, { status: 201 });
}
