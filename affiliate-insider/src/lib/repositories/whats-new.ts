import type { WhatsNewItem, WhatsNewResourceType } from '@/types';
import { generateId, readDatabase, updateDatabase } from '../data/store';

export function recordWhatsNew(
  resource_type: WhatsNewResourceType,
  resource_id: string,
  title: string,
  description: string
): void {
  updateDatabase((db) => {
    const item: WhatsNewItem = {
      id: generateId(),
      resource_type,
      resource_id,
      title,
      description,
      created_at: new Date().toISOString(),
    };
    db.whats_new = [item, ...db.whats_new.filter((w) => w.resource_id !== resource_id)].slice(
      0,
      100
    );
  });
}

export function getWhatsNew(limit = 20): WhatsNewItem[] {
  return readDatabase()
    .whats_new.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, limit);
}
