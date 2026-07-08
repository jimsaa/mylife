'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { defaultContentMeta, defaultAiToolFields, defaultLinkFields } from '@/types';

export interface FieldConfig {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'number' | 'checkbox' | 'select';
  options?: string[];
}

function EditorForm({
  resource,
  title,
  fields,
  backHref,
  defaults,
}: {
  resource: string;
  title: string;
  fields: FieldConfig[];
  backHref: string;
  defaults?: Record<string, unknown>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const [form, setForm] = useState<Record<string, unknown>>({
    ...defaultContentMeta(),
    ...defaultLinkFields(),
    ...defaults,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editId) return;
    fetch(`/api/admin/${resource}`)
      .then((r) => r.json())
      .then((d) => {
        const item = (d.items as { id: string }[]).find((i) => i.id === editId);
        if (item) {
          const loaded = { ...(item as Record<string, unknown>) };
          if (Array.isArray(loaded.recommendation_reasons)) {
            loaded.recommendation_reasons = loaded.recommendation_reasons.join('\n');
          }
          setForm(loaded);
        }
      });
  }, [editId, resource]);

  const set = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setSaving(true);
    const payload = { ...form };
    if (typeof payload.items_included === 'string') {
      payload.items_included = String(payload.items_included)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (typeof payload.recommendation_reasons === 'string') {
      payload.recommendation_reasons = String(payload.recommendation_reasons)
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (payload.difficulty === '') payload.difficulty = null;
    if (payload.recommendation_status === '') payload.recommendation_status = null;
    const url = editId ? `/api/admin/${resource}/${editId}` : `/api/admin/${resource}`;
    const method = editId ? 'PUT' : 'POST';
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    router.push(backHref);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={backHref} className="text-sm text-violet-600 hover:underline">
        ← Back
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">
        {editId ? 'Edit' : 'New'} {title}
      </h1>

      <div className="mt-8 space-y-4">
        {fields.map((field) => (
          <label key={field.key} className="block">
            <span className="text-sm font-medium text-zinc-700">{field.label}</span>
            {field.type === 'textarea' ? (
              <textarea
                className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm"
                rows={4}
                value={String(form[field.key] ?? '')}
                onChange={(e) => set(field.key, e.target.value)}
              />
            ) : field.type === 'checkbox' ? (
              <input
                type="checkbox"
                className="ml-2"
                checked={Boolean(form[field.key])}
                onChange={(e) => set(field.key, e.target.checked)}
              />
            ) : field.type === 'select' ? (
              <select
                className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm"
                value={String(form[field.key] ?? '')}
                onChange={(e) => set(field.key, e.target.value)}
              >
                {field.options?.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                type={field.type === 'number' ? 'number' : 'text'}
                className="mt-1"
                value={String(form[field.key] ?? '')}
                onChange={(e) =>
                  set(
                    field.key,
                    field.type === 'number' ? Number(e.target.value) : e.target.value
                  )
                }
              />
            )}
          </label>
        ))}

        <div className="flex gap-3 border-t border-zinc-100 pt-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(form.published)}
              onChange={(e) => set('published', e.target.checked)}
            />
            Published
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(form.featured)}
              onChange={(e) => set('featured', e.target.checked)}
            />
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(form.draft)}
              onChange={(e) => set('draft', e.target.checked)}
            />
            Draft
          </label>
        </div>

        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

export function AdminEditorPage(props: {
  resource: string;
  title: string;
  fields: FieldConfig[];
  backHref: string;
  defaults?: Record<string, unknown>;
}) {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <EditorForm {...props} />
    </Suspense>
  );
}

const META_FIELDS: FieldConfig[] = [
  { key: 'priority', label: 'Priority', type: 'number' },
];

export const PROMPT_FIELDS: FieldConfig[] = [
  { key: 'title', label: 'Title' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'content', label: 'Content', type: 'textarea' },
  {
    key: 'category',
    label: 'Category',
    type: 'select',
    options: ['facebook', 'tiktok', 'instagram', 'email', 'affiliate', 'ads'],
  },
  ...META_FIELDS,
];

export const HOOK_FIELDS: FieldConfig[] = [
  { key: 'text', label: 'Hook text', type: 'textarea' },
  { key: 'platform', label: 'Platform' },
  { key: 'category', label: 'Category' },
  ...META_FIELDS,
];

export const TOOL_FIELDS: FieldConfig[] = [
  { key: 'name', label: 'Name' },
  { key: 'slug', label: 'URL slug (for /go/tool/...)' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'pricing', label: 'Pricing' },
  {
    key: 'category',
    label: 'Category',
    type: 'select',
    options: ['ai_builder', 'writing', 'video', 'image', 'automation', 'analytics', 'seo'],
  },
  {
    key: 'difficulty',
    label: 'Difficulty',
    type: 'select',
    options: ['', 'beginner', 'intermediate', 'advanced'],
  },
  { key: 'free_trial', label: 'Free trial', type: 'checkbox' },
  {
    key: 'recommendation_status',
    label: 'Recommendation status',
    type: 'select',
    options: ['', 'recommended'],
  },
  {
    key: 'recommendation_reasons',
    label: 'Why we recommend (one per line)',
    type: 'textarea',
  },
  { key: 'badge', label: 'Badge' },
  { key: 'affiliate_url', label: 'Primary URL (affiliate)' },
  { key: 'button_text', label: 'Primary button label' },
  { key: 'website_url', label: 'Secondary URL (learn more)' },
  { key: 'secondary_button_label', label: 'Secondary button label' },
  ...META_FIELDS,
];

export const PROGRAM_FIELDS: FieldConfig[] = [
  { key: 'name', label: 'Name' },
  { key: 'commission', label: 'Commission' },
  { key: 'cookie_duration', label: 'Cookie duration' },
  { key: 'payout', label: 'Payout' },
  { key: 'category', label: 'Category' },
  { key: 'website_url', label: 'Website URL' },
  { key: 'affiliate_url', label: 'Affiliate / Apply URL' },
  { key: 'button_text', label: 'Button text' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
  ...META_FIELDS,
];

export const DOWNLOAD_FIELDS: FieldConfig[] = [
  { key: 'title', label: 'Title' },
  { key: 'description', label: 'Description', type: 'textarea' },
  {
    key: 'type',
    label: 'Type',
    type: 'select',
    options: ['pdf', 'template', 'checklist', 'notion', 'canva'],
  },
  { key: 'file_url', label: 'File URL' },
  { key: 'external_url', label: 'External URL' },
  ...META_FIELDS,
];

export const UPDATE_FIELDS: FieldConfig[] = [
  { key: 'title', label: 'Title' },
  { key: 'description', label: 'Description', type: 'textarea' },
  ...META_FIELDS,
];

export const DROP_FIELDS: FieldConfig[] = [
  { key: 'title', label: 'Title' },
  { key: 'month', label: 'Month (YYYY-MM)' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'image_url', label: 'Image URL' },
  { key: 'release_date', label: 'Release date (YYYY-MM-DD)' },
  { key: 'items_included', label: 'Items (comma-separated)' },
  {
    key: 'visible_to',
    label: 'Visible to',
    type: 'select',
    options: ['vault', 'vip', 'both'],
  },
  ...META_FIELDS,
];
