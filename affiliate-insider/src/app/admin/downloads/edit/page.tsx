import { AdminEditorPage, DOWNLOAD_FIELDS } from '@/components/admin/content-editor';

export default function EditDownloadPage() {
  return (
    <AdminEditorPage
      resource="downloads"
      title="Download"
      fields={DOWNLOAD_FIELDS}
      backHref="/admin/downloads"
    />
  );
}
