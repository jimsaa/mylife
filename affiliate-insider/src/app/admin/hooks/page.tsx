'use client';

import { AdminResourceList } from '@/components/admin/resource-list';
import type { Hook } from '@/types';

export default function AdminHooksPage() {
  return (
    <AdminResourceList<Hook>
      resource="hooks"
      title="Hooks"
      newHref="/admin/hooks/edit"
      searchKey="text"
      columns={[
        { key: 'text', label: 'Hook', render: (h) => h.text.slice(0, 50) },
        { key: 'platform', label: 'Platform' },
        { key: 'category', label: 'Category' },
      ]}
    />
  );
}
