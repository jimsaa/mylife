'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AiTool } from '@/types';
import { LESSON_1_HREF } from '@/lib/setup-wizard/access';
import { WizardShell } from './wizard-shell';
import { StepBuilder } from './step-builder';
import { StepChat } from './step-chat';
import { StepComplete } from './step-complete';

export function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [builderTool, setBuilderTool] = useState<AiTool | null>(null);
  const [selectedChat, setSelectedChat] = useState<string | null>('chatgpt');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/setup-wizard')
      .then((r) => r.json())
      .then((d) => {
        if (d.completed) {
          router.replace('/vault');
          return;
        }
        setBuilderTool(d.recommended_builder ?? null);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const finish = async (chatChoice: string | null) => {
    await fetch('/api/setup-wizard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferred_ai_chat: chatChoice }),
    });
    router.push(LESSON_1_HREF);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-500">
        Loading...
      </div>
    );
  }

  return (
    <WizardShell step={step}>
      {step === 1 && (
        <StepBuilder tool={builderTool} onAlreadyInstalled={() => setStep(2)} />
      )}
      {step === 2 && (
        <StepChat
          selected={selectedChat}
          onSelect={setSelectedChat}
          onContinue={() => setStep(3)}
          onLater={() => {
            setSelectedChat(null);
            setStep(3);
          }}
        />
      )}
      {step === 3 && (
        <StepComplete onFinish={() => finish(selectedChat)} />
      )}
    </WizardShell>
  );
}
