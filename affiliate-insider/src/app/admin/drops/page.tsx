'use client';

import { AdminResourceList } from '@/components/admin/resource-list';
import type { MonthlyDrop } from '@/types';

export default function AdminDropsPage() {
  return (
    <AdminResourceList<MonthlyDrop>
      resource="monthly_drops"
      title="Monthly Drops"
      newHref="/admin/drops/edit"
      searchKey="title"
      columns={[
        { key: 'title', label: 'Title' },
        { key: 'month', label: 'Month' },
        {
          key: 'visible_to',
          label: 'Visible to',
        },
      ]}
    />
  );
}
