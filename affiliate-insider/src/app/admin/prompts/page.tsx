'use client';

import { AdminResourceList } from '@/components/admin/resource-list';
import type { Prompt } from '@/types';

export default function AdminPromptsPage() {
  return (
    <AdminResourceList<Prompt>
      resource="prompts"
      title="Prompts"
      newHref="/admin/prompts/edit"
      searchKey="title"
      columns={[
        { key: 'title', label: 'Title' },
        { key: 'category', label: 'Category' },
        { key: 'priority', label: 'Priority' },
      ]}
    />
  );
}
