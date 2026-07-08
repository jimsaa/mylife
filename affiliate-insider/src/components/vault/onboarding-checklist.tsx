'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle } from 'lucide-react';
import { onboardingCompletionPercent, type OnboardingTaskId } from '@/types';
import { VaultCard, VaultProgressBar } from '@/components/vault/vault-ui';
import { cn } from '@/lib/utils';

const TASKS: { id: keyof OnboardingTaskId; label: string; href: string }[] = [
  { id: 'quick_start', label: 'Read Quick Start', href: '/vault/start' },
  { id: 'first_prompts', label: 'Copy your first prompts', href: '/vault/prompts' },
  { id: 'explore_tools', label: 'Explore AI Tools', href: '/vault/ai-tools' },
  { id: 'save_favorites', label: 'Save favorite tools', href: '/vault/ai-tools' },
  { id: 'starter_pack', label: 'Download Starter Pack', href: '/vault/downloads' },
  { id: 'complete_profile', label: 'Complete profile', href: '/vault/profile' },
];

export function OnboardingChecklist() {
  const [tasks, setTasks] = useState<OnboardingTaskId | null>(null);

  const load = () => {
    fetch('/api/onboarding')
      .then((r) => r.json())
      .then((d) => setTasks(d.progress?.tasks ?? null));
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (id: keyof OnboardingTaskId) => {
    if (!tasks) return;
    const updated = { ...tasks, [id]: !tasks[id] };
    await fetch('/api/onboarding', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks: updated }),
    });
    setTasks(updated);
  };

  if (!tasks) return null;

  const percent = onboardingCompletionPercent(tasks);

  return (
    <VaultCard compact>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Getting started</h2>
        <span className="text-sm font-medium text-violet-400">{percent}% complete</span>
      </div>
      <div className="mt-3">
        <VaultProgressBar percent={percent} />
      </div>
      <ul className="mt-6 space-y-3">
        {TASKS.map((task) => {
          const done = tasks[task.id];
          return (
            <li key={task.id} className="flex items-center gap-3">
              <button type="button" onClick={() => toggle(task.id)} className="shrink-0">
                {done ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <Circle className="h-5 w-5 text-zinc-600" />
                )}
              </button>
              <Link
                href={task.href}
                className={cn('text-sm', done ? 'text-zinc-600 line-through' : 'text-zinc-300')}
              >
                {task.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </VaultCard>
  );
}
