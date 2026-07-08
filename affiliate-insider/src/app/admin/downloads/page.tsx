'use client';

import { AdminResourceList } from '@/components/admin/resource-list';
import type { DownloadAsset } from '@/types';

export default function AdminDownloadsPage() {
  return (
    <AdminResourceList<DownloadAsset>
      resource="downloads"
      title="Downloads"
      newHref="/admin/downloads/edit"
      searchKey="title"
      columns={[
        { key: 'title', label: 'Title' },
        { key: 'type', label: 'Type' },
      ]}
    />
  );
}
