'use client';

import { AdminResourceList } from '@/components/admin/resource-list';
import type { AiTool } from '@/types';

export default function AdminAiToolsPage() {
  return (
    <AdminResourceList<AiTool>
      resource="ai_tools"
      title="AI Tools"
      newHref="/admin/ai-tools/edit"
      searchKey="name"
      columns={[
        { key: 'name', label: 'Tool' },
        { key: 'category', label: 'Category' },
        { key: 'click_count', label: 'Clicks' },
        { key: 'pricing', label: 'Pricing' },
        { key: 'priority', label: 'Priority' },
      ]}
    />
  );
}
