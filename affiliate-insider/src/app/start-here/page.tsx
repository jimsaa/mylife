import { SetupWizard } from '@/components/setup-wizard/setup-wizard';

export default function StartHerePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 px-4 py-16 sm:py-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[120px]" />
      </div>
      <div className="relative">
        <SetupWizard />
      </div>
    </div>
  );
}
