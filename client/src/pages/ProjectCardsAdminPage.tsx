import { useEffect, useRef, useState, type FormEvent } from 'react';
import { projectCardApi } from '../api';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input, Textarea } from '../components/ui/Input';
import type { ProjectCard } from '../types';

interface FormState {
  id?: number;
  title: string;
  description: string;
  url: string;
  active: boolean;
  sort_order: number;
  preview_url?: string;
}

interface PendingImage {
  image_base64: string;
  mime_type: string;
}

const emptyForm = (): FormState => ({
  title: '',
  description: '',
  url: '',
  active: true,
  sort_order: 0,
});

function mimeFromFile(file: File): string {
  if (file.type && file.type.startsWith('image/')) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  return 'image/jpeg';
}

function readFileAsBase64(file: File): Promise<PendingImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      const image_base64 = comma >= 0 ? result.slice(comma + 1) : result;
      if (!image_base64) {
        reject(new Error('Could not read image data.'));
        return;
      }
      resolve({ image_base64, mime_type: mimeFromFile(file) });
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err.trim()) return err;
  return 'Save failed. Is the API server running (npm run dev)?';
}

function isProductionHost(): boolean {
  if (typeof window === 'undefined') return false;
  return /jimsaari\.se$/i.test(window.location.hostname);
}

export function ProjectCardsAdminPage() {
  const [cards, setCards] = useState<ProjectCard[]>([]);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [readingImage, setReadingImage] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingImageRef = useRef<PendingImage | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  const load = async () => {
    try {
      setError(null);
      setCards(await projectCardApi.listAdmin());
    } catch (err) {
      console.error(err);
      const detail = errorMessage(err);
      setError(
        isProductionHost()
          ? `${detail} Manage and save Project Cards at http://localhost:3006/admin/project-cards (npm run dev). jimsaari.se has no Express/SQLite API.`
          : detail ||
              'Could not load project cards. Make sure the API is running (npm run dev) and you are logged in.',
      );
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [error]);

  const openCreate = () => {
    pendingImageRef.current = null;
    setImageReady(false);
    const nextOrder =
      cards.length === 0 ? 1 : Math.max(...cards.map((c) => c.sort_order)) + 1;
    setEditing({ ...emptyForm(), sort_order: nextOrder });
    setMessage(null);
    setError(null);
  };

  const openEdit = (card: ProjectCard) => {
    pendingImageRef.current = null;
    setImageReady(false);
    setEditing({
      id: card.id,
      title: card.title,
      description: card.description ?? '',
      url: card.url,
      active: card.active === 1,
      sort_order: card.sort_order,
      preview_url: card.image_url,
    });
    setMessage(null);
    setError(null);
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    setReadingImage(true);
    setError(null);
    try {
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File too large. Max 5 MB.');
      }
      const pending = await readFileAsBase64(file);
      pendingImageRef.current = pending;
      setImageReady(true);
      setEditing((prev) =>
        prev
          ? {
              ...prev,
              preview_url: URL.createObjectURL(file),
            }
          : prev,
      );
    } catch (err) {
      pendingImageRef.current = null;
      setImageReady(false);
      setError(errorMessage(err));
    } finally {
      setReadingImage(false);
    }
  };

  const save = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!editing || saving) return;

    const title = editing.title.trim();
    const url = editing.url.trim();
    if (!title || !url) {
      setError('Title and URL are required.');
      return;
    }
    if (!editing.id && !pendingImageRef.current) {
      setError('Image is required for new cards. Choose a file first.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const imagePayload = pendingImageRef.current
        ? {
            image_base64: pendingImageRef.current.image_base64,
            mime_type: pendingImageRef.current.mime_type,
          }
        : {};

      if (editing.id) {
        await projectCardApi.update(editing.id, {
          title,
          description: editing.description.trim() || null,
          url,
          active: editing.active,
          sort_order: editing.sort_order,
          ...imagePayload,
        });
        setMessage('Project card updated.');
      } else {
        await projectCardApi.create({
          title,
          description: editing.description.trim() || null,
          url,
          active: editing.active,
          sort_order: editing.sort_order,
          image_base64: pendingImageRef.current!.image_base64,
          mime_type: pendingImageRef.current!.mime_type,
        });
        setMessage('Project card created.');
      }

      pendingImageRef.current = null;
      setImageReady(false);
      setEditing(null);
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (err) {
      console.error('Project card save failed:', err);
      const detail = errorMessage(err);
      setError(
        isProductionHost()
          ? `${detail} Use http://localhost:3006/admin/project-cards to save (API + SQLite). Production needs a deployed Project Cards API + Vercel Blob.`
          : detail,
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (card: ProjectCard) => {
    if (!confirm(`Delete project card "${card.title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await projectCardApi.remove(card.id);
      setMessage('Project card deleted.');
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Cards"
        subtitle="Homepage cards for jimsaari.se — add, edit, hide, and reorder"
        action={
          <Button onClick={openCreate} disabled={!!editing}>
            + Add Project
          </Button>
        }
      />

      {message && (
        <p className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
          {message}
        </p>
      )}
      {error && (
        <p
          ref={errorRef}
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}

      {editing && (
        <Card>
          <h2 className="mb-4 text-base font-semibold">
            {editing.id ? 'Edit project card' : 'Add project card'}
          </h2>
          <form
            className="grid max-w-xl gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void save(e);
            }}
          >
            <Field label="Image">
              <div className="flex items-start gap-4">
                <div className="aspect-[4/5] w-28 overflow-hidden rounded-lg border border-border bg-surface-muted">
                  {editing.preview_url ? (
                    <img
                      src={editing.preview_url}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-text-muted">
                      No image
                    </div>
                  )}
                </div>
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                    className="text-sm"
                    onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
                  />
                  <p className="mt-1 text-xs text-text-muted">
                    PNG, JPG or WEBP · max 5 MB · 4:5 display
                    {readingImage ? ' · Reading image…' : ''}
                    {imageReady ? ' · Image ready' : ''}
                  </p>
                </div>
              </div>
            </Field>

            <Field label="Title">
              <Input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                required
              />
            </Field>

            <Field label="Description (optional)">
              <Textarea
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </Field>

            <Field label="Link">
              <Input
                type="text"
                inputMode="url"
                value={editing.url}
                onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                placeholder="https://example.com or /path"
                required
              />
            </Field>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.active}
                onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
              />
              Active (visible on homepage)
            </label>

            <Field label="Sort order">
              <Input
                type="number"
                value={editing.sort_order}
                onChange={(e) =>
                  setEditing({ ...editing, sort_order: Number(e.target.value) || 0 })
                }
              />
            </Field>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving || readingImage}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  pendingImageRef.current = null;
                  setImageReady(false);
                  setEditing(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="py-2 pr-3">Image</th>
                <th className="py-2 pr-3">Title</th>
                <th className="py-2 pr-3">Active</th>
                <th className="py-2 pr-3">Order</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cards.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-text-muted">
                    No project cards yet. Click “Add Project” to create one.
                  </td>
                </tr>
              )}
              {cards.map((card) => (
                <tr key={card.id} className="border-b border-border align-middle">
                  <td className="py-3 pr-3">
                    <div className="aspect-[4/5] w-14 overflow-hidden rounded border border-border bg-surface-muted">
                      <img
                        src={card.image_url}
                        alt={card.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <p className="font-medium">{card.title}</p>
                    {card.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-text-muted">
                        {card.description}
                      </p>
                    )}
                    <p className="mt-0.5 truncate text-xs text-text-muted">{card.url}</p>
                  </td>
                  <td className="py-3 pr-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        card.active
                          ? 'bg-teal-50 text-teal-800'
                          : 'bg-surface-muted text-text-muted'
                      }`}
                    >
                      {card.active ? 'ON' : 'OFF'}
                    </span>
                  </td>
                  <td className="py-3 pr-3">{card.sort_order}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(card)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => void remove(card)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
