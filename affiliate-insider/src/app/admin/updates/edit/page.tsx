import { AdminEditorPage, UPDATE_FIELDS } from '@/components/admin/content-editor';

export default function EditUpdatePage() {
  return (
    <AdminEditorPage
      resource="vault_updates"
      title="Update"
      fields={UPDATE_FIELDS}
      backHref="/admin/updates"
    />
  );
}
