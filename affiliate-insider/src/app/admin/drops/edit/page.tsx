import { AdminEditorPage, DROP_FIELDS } from '@/components/admin/content-editor';

export default function EditDropPage() {
  return (
    <AdminEditorPage
      resource="monthly_drops"
      title="Monthly Drop"
      fields={DROP_FIELDS}
      backHref="/admin/drops"
    />
  );
}
