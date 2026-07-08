export type ContentCollection =
  | 'prompts'
  | 'hooks'
  | 'ai_tools'
  | 'affiliate_programs'
  | 'downloads'
  | 'vault_updates'
  | 'monthly_drops';

export const ADMIN_RESOURCES: { key: ContentCollection; label: string; href: string }[] = [
  { key: 'prompts', label: 'Prompts', href: '/admin/prompts' },
  { key: 'hooks', label: 'Hooks', href: '/admin/hooks' },
  { key: 'ai_tools', label: 'AI Tools', href: '/admin/ai-tools' },
  { key: 'affiliate_programs', label: 'Affiliate Programs', href: '/admin/programs' },
  { key: 'downloads', label: 'Downloads', href: '/admin/downloads' },
  { key: 'vault_updates', label: 'Monthly Updates', href: '/admin/updates' },
  { key: 'monthly_drops', label: 'Monthly Drops', href: '/admin/drops' },
];
