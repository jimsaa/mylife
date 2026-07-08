import { createHash } from 'crypto';
import { resolveToolOutboundUrl } from '@/lib/ai-tools/redirect';
import { generateId, readDatabase, updateDatabase } from '@/lib/data/store';
import { getServerSession } from '@/lib/auth/session';
import type { AiTool } from '@/types';
import type { ToolClick, ToolClickStats } from '@/types/tool-clicks';

function now() {
  return new Date().toISOString();
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

export function getToolBySlug(slug: string): AiTool | null {
  const normalized = slug.toLowerCase();
  return (
    readDatabase().ai_tools.find(
      (t) => t.slug.toLowerCase() === normalized && t.published && !t.draft
    ) ?? null
  );
}

export function logToolClick(
  toolId: string,
  data: { user_id?: string | null; ip_hash?: string | null; referrer?: string | null }
): void {
  const click: ToolClick = {
    id: generateId(),
    tool_id: toolId,
    user_id: data.user_id ?? null,
    ip_hash: data.ip_hash ?? null,
    referrer: data.referrer ?? null,
    created_at: now(),
  };

  updateDatabase((db) => {
    db.tool_clicks.push(click);
    const tool = db.ai_tools.find((t) => t.id === toolId);
    if (tool) tool.click_count = (tool.click_count ?? 0) + 1;
  });
}

export async function handleToolRedirect(
  slug: string,
  request: Request,
  dest?: 'website' | 'affiliate'
): Promise<{ url: string } | null> {
  const tool = getToolBySlug(slug);
  if (!tool) return null;

  const session = await getServerSession();
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? '';
  const referrer = request.headers.get('referer');

  logToolClick(tool.id, {
    user_id: session?.id ?? null,
    ip_hash: ip ? hashIp(ip) : null,
    referrer,
  });

  return { url: resolveToolOutboundUrl(tool, dest) };
}

export function getTopTools(limit = 5): ToolClickStats[] {
  const db = readDatabase();
  return [...db.ai_tools]
    .filter((t) => t.published && !t.draft)
    .sort((a, b) => (b.click_count ?? 0) - (a.click_count ?? 0))
    .slice(0, limit)
    .map((t) => ({
      tool_id: t.id,
      slug: t.slug,
      name: t.name,
      clicks: t.click_count ?? 0,
    }));
}

export function getTopToolId(): string | null {
  const top = getTopTools(1)[0];
  return top?.clicks > 0 ? top.tool_id : null;
}
