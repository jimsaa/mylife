import { NextResponse } from 'next/server';
import {
  getPublicAiTools,
  getPublicDownloads,
  getPublicHooks,
  getPublicMonthlyDrops,
  getPublicPrograms,
  getPublicPrompts,
  getPublicVaultUpdates,
} from '@/lib/repositories/content-repository';

const PUBLIC_GETTERS: Record<string, () => unknown[]> = {
  prompts: getPublicPrompts,
  hooks: getPublicHooks,
  ai_tools: getPublicAiTools,
  affiliate_programs: getPublicPrograms,
  downloads: getPublicDownloads,
  vault_updates: getPublicVaultUpdates,
  monthly_drops: getPublicMonthlyDrops,
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resource: string }> }
) {
  const { resource } = await params;
  const getter = PUBLIC_GETTERS[resource];
  if (!getter) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ items: getter() });
}
