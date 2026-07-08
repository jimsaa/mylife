import { vaultPanelClass } from '@/components/vault/vault-ui';
import { cn } from '@/lib/utils';
import type { ToolClickStats } from '@/types/tool-clicks';

export function TopPerformingTools({ tools }: { tools: ToolClickStats[] }) {
  if (tools.length === 0) return null;

  return (
    <div className={cn(vaultPanelClass, 'overflow-hidden p-0')}>
      <div className="border-b border-white/10 p-6">
        <h2 className="font-semibold text-white">Top performing tools</h2>
        <p className="mt-1 text-sm text-zinc-500">Which recommended tools members click most.</p>
      </div>
      <ol className="divide-y divide-white/5 p-4">
        {tools.map((tool, i) => (
          <li key={tool.tool_id} className="flex items-center justify-between px-2 py-3">
            <span className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-medium text-zinc-400">
                {i + 1}
              </span>
              <span className="font-medium text-zinc-200">{tool.name}</span>
            </span>
            <span className="tabular-nums text-sm text-zinc-500">{tool.clicks} clicks</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
