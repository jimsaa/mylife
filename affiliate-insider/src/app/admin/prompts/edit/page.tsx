import { AdminEditorPage, PROMPT_FIELDS } from '@/components/admin/content-editor';

export default function EditPromptPage() {
  return (
    <AdminEditorPage
      resource="prompts"
      title="Prompt"
      fields={PROMPT_FIELDS}
      backHref="/admin/prompts"
    />
  );
}
