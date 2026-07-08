'use client';

import { AdminResourceList } from '@/components/admin/resource-list';
import type { AffiliateProgram } from '@/types';

export default function AdminProgramsPage() {
  return (
    <AdminResourceList<AffiliateProgram>
      resource="affiliate_programs"
      title="Affiliate Programs"
      newHref="/admin/programs/edit"
      searchKey="name"
      columns={[
        { key: 'name', label: 'Program' },
        { key: 'commission', label: 'Commission' },
        { key: 'category', label: 'Category' },
      ]}
    />
  );
}
