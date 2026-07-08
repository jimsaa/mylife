import {
  Bot,
  Download,
  FileText,
  Handshake,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { LANDING_BENEFITS } from '@/lib/constants';
import { CardDark } from '@/components/ui/card';

const ICONS = {
  Sparkles,
  Zap,
  FileText,
  Bot,
  Handshake,
  Download,
  RefreshCw,
} as const;

export function BenefitsSection() {
  return (
    <section className="px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold text-white">Everything in Builder Pass</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-zinc-400">
          Premium resources built for speed — not overwhelm.
        </p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LANDING_BENEFITS.map((benefit) => {
            const Icon = ICONS[benefit.icon as keyof typeof ICONS];
            return (
              <CardDark key={benefit.title} className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">✓ {benefit.title}</h3>
                  <p className="mt-1 text-sm text-zinc-400">{benefit.description}</p>
                </div>
              </CardDark>
            );
          })}
        </div>
      </div>
    </section>
  );
}
