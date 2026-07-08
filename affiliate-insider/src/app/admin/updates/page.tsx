'use client';

import { AdminResourceList } from '@/components/admin/resource-list';
import type { VaultUpdate } from '@/types';

export default function AdminUpdatesPage() {
  return (
    <AdminResourceList<VaultUpdate>
      resource="vault_updates"
      title="Monthly Updates"
      newHref="/admin/updates/edit"
      searchKey="title"
      columns={[
        { key: 'title', label: 'Title' },
        { key: 'description', label: 'Description', render: (u) => u.description.slice(0, 40) },
      ]}
    />
  );
}
