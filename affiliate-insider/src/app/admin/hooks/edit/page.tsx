import { AdminEditorPage, HOOK_FIELDS } from '@/components/admin/content-editor';

export default function EditHookPage() {
  return (
    <AdminEditorPage resource="hooks" title="Hook" fields={HOOK_FIELDS} backHref="/admin/hooks" />
  );
}
