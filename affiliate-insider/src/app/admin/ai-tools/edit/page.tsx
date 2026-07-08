import { AdminEditorPage, TOOL_FIELDS } from '@/components/admin/content-editor';
import { defaultAiToolFields } from '@/types';

export default function EditToolPage() {
  return (
    <AdminEditorPage
      resource="ai_tools"
      title="AI Tool"
      fields={TOOL_FIELDS}
      backHref="/admin/ai-tools"
      defaults={defaultAiToolFields()}
    />
  );
}
