'use client';

import { Search } from 'lucide-react';
import { Input, InputDark } from './input';
import { cn } from '@/lib/utils';

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  variant = 'default',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  variant?: 'default' | 'vault';
}) {
  const isVault = variant === 'vault';
  return (
    <div className="relative">
      <Search
        className={cn(
          'absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2',
          isVault ? 'text-zinc-500' : 'text-zinc-400'
        )}
      />
      {isVault ? (
        <InputDark
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-10"
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-10"
        />
      )}
    </div>
  );
}
