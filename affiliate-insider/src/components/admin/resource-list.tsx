'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ContentMetaFields {
  published?: boolean;
  featured?: boolean;
  draft?: boolean;
  priority?: number;
}

interface AdminResourceListProps<T extends { id: string } & ContentMetaFields> {
  resource: string;
  title: string;
  columns: { key: keyof T | string; label: string; render?: (item: T) => React.ReactNode }[];
  newHref: string;
  searchKey?: keyof T;
}

export function AdminResourceList<T extends { id: string } & ContentMetaFields>({
  resource,
  title,
  columns,
  newHref,
  searchKey = 'title' as keyof T,
}: AdminResourceListProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch(`/api/admin/${resource}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [resource]);

  const filtered = items.filter((item) => {
    if (!search) return true;
    const val = item[searchKey as keyof T];
    return String(val ?? '').toLowerCase().includes(search.toLowerCase());
  });

  const remove = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    await fetch(`/api/admin/${resource}/${id}`, { method: 'DELETE' });
    load();
  };

  const toggle = async (item: T, field: 'published' | 'featured' | 'draft') => {
    await fetch(`/api/admin/${resource}/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: !item[field] }),
    });
    load();
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
        <Link href={newHref}>
          <Button size="sm">+ New</Button>
        </Link>
      </div>

      <Input
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 max-w-sm"
      />

      {loading ? (
        <p className="text-zinc-500">Loading...</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50 text-zinc-500">
              <tr>
                {columns.map((c) => (
                  <th key={String(c.key)} className="px-4 py-3 font-medium">
                    {c.label}
                  </th>
                ))}
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                  {columns.map((c) => (
                    <td key={String(c.key)} className="max-w-xs truncate px-4 py-3 text-zinc-800">
                      {c.render
                        ? c.render(item)
                        : String((item as Record<string, unknown>)[c.key as string] ?? '')}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => toggle(item, 'published')}
                        className={cn(
                          'rounded px-2 py-0.5 text-xs',
                          item.published ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                        )}
                      >
                        {item.published ? 'Live' : 'Hidden'}
                      </button>
                      {item.featured !== undefined && (
                        <button
                          type="button"
                          onClick={() => toggle(item, 'featured')}
                          className={cn(
                            'rounded px-2 py-0.5 text-xs',
                            item.featured ? 'bg-violet-100 text-violet-700' : 'bg-zinc-100 text-zinc-500'
                          )}
                        >
                          ★
                        </button>
                      )}
                      {item.draft && (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                          Draft
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`${newHref}?id=${item.id}`}
                      className="mr-3 text-violet-600 hover:underline"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      className="text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
