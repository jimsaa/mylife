import type {
  AffiliateAsset,
  AffiliateClick,
  AffiliateCommission,
  AffiliateLink,
  AffiliatePayout,
  AffiliatePayoutSettings,
  AffiliateProfile,
  AffiliateProgramConfig,
  AffiliateReferral,
} from '@/types/affiliate';
import type {
  AffiliateProgram,
  AiTool,
  DownloadAsset,
  Hook,
  MonthlyDrop,
  Prompt,
  Purchase,
  UserProfile,
  UserProgress,
  VaultUpdate,
  WhatsNewItem,
} from '@/types';
import type { ToolClick } from '@/types/tool-clicks';

export interface Database {
  users: UserProfile[];
  purchases: Purchase[];
  prompts: Prompt[];
  hooks: Hook[];
  ai_tools: AiTool[];
  affiliate_programs: AffiliateProgram[];
  downloads: DownloadAsset[];
  vault_updates: VaultUpdate[];
  monthly_drops: MonthlyDrop[];
  user_progress: UserProgress[];
  whats_new: WhatsNewItem[];
  affiliate_profiles: AffiliateProfile[];
  affiliate_links: AffiliateLink[];
  affiliate_clicks: AffiliateClick[];
  affiliate_referrals: AffiliateReferral[];
  affiliate_commissions: AffiliateCommission[];
  affiliate_payouts: AffiliatePayout[];
  affiliate_payout_settings: AffiliatePayoutSettings[];
  affiliate_program_config: AffiliateProgramConfig;
  affiliate_assets: AffiliateAsset[];
  tool_clicks: ToolClick[];
  meta: {
    seeded_at: string;
    version: number;
  };
}

export const DB_VERSION = 7;
