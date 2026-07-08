import { AdminEditorPage, PROGRAM_FIELDS } from '@/components/admin/content-editor';

export default function EditProgramPage() {
  return (
    <AdminEditorPage
      resource="affiliate_programs"
      title="Program"
      fields={PROGRAM_FIELDS}
      backHref="/admin/programs"
    />
  );
}
