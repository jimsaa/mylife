'use client';

import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FavoriteButton({
  active,
  onToggle,
}: {
  active?: boolean;
  onToggle?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'rounded-lg p-2 transition',
        active ? 'text-rose-500' : 'text-zinc-400 hover:text-rose-400'
      )}
      aria-label={active ? 'Remove favorite' : 'Add favorite'}
    >
      <Heart className={cn('h-5 w-5', active && 'fill-current')} />
    </button>
  );
}
