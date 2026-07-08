'use client';

import { useState } from 'react';
import { Section, SectionTitle } from './section';
import { LANDING_FAQ } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Section narrow>
      <SectionTitle title="Frequently asked questions" />

      <div className="space-y-2">
        {LANDING_FAQ.map((item, i) => (
          <div key={item.q} className="rounded-xl border border-white/10 bg-white/[0.02]">
            <button
              type="button"
              className="flex w-full items-center justify-between px-5 py-4 text-left font-medium text-white"
              onClick={() => setOpen(open === i ? null : i)}
            >
              {item.q}
              <span className="ml-4 shrink-0 text-violet-400">{open === i ? '−' : '+'}</span>
            </button>
            <div
              className={cn(
                'overflow-hidden px-5 text-zinc-400 transition-all',
                open === i ? 'max-h-48 pb-4' : 'max-h-0'
              )}
            >
              {item.a}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
