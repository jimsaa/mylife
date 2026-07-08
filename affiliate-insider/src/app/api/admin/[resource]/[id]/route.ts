import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { hasAdminAccess } from '@/lib/auth/permissions';
import { updateItem, deleteItem } from '@/lib/repositories/content-repository';
import type { ContentCollection } from '@/lib/admin/collections';

const VALID: ContentCollection[] = [
  'prompts',
  'hooks',
  'ai_tools',
  'affiliate_programs',
  'downloads',
  'vault_updates',
  'monthly_drops',
];

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  const user = await getServerSession();
  if (!user || !hasAdminAccess(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { resource, id } = await params;
  if (!VALID.includes(resource as ContentCollection)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const item = updateItem(resource as ContentCollection, id, body);
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ item });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  const user = await getServerSession();
  if (!user || !hasAdminAccess(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { resource, id } = await params;
  if (!VALID.includes(resource as ContentCollection)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const ok = deleteItem(resource as ContentCollection, id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
