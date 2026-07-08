export type UserRole = 'FREE' | 'VAULT_MEMBER' | 'VIP_MEMBER' | 'ADMIN';

export interface ContentMeta {
  published: boolean;
  featured: boolean;
  draft: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  /** Setup wizard "Welcome to Builder Pass" — null until completed */
  onboarding_completed_at: string | null;
  preferred_ai_chat: string | null;
}

export type PromptCategory =
  | 'facebook'
  | 'tiktok'
  | 'instagram'
  | 'email'
  | 'affiliate'
  | 'ads';

export interface Prompt extends ContentMeta {
  id: string;
  title: string;
  description: string;
  content: string;
  category: PromptCategory;
  is_favorite?: boolean;
}

export interface Hook extends ContentMeta {
  id: string;
  text: string;
  category: string;
  platform: string;
  is_favorite?: boolean;
}

export type AiToolCategory =
  | 'ai_builder'
  | 'writing'
  | 'video'
  | 'image'
  | 'automation'
  | 'analytics'
  | 'seo';

export type AiToolDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type AiToolRecommendationStatus = 'recommended';

export interface LinkFields {
  website_url: string;
  affiliate_url: string | null;
  button_text: string;
  secondary_button_label: string | null;
}

export interface AiTool extends ContentMeta, LinkFields {
  id: string;
  slug: string;
  name: string;
  description: string;
  pricing: string;
  category: AiToolCategory;
  difficulty: AiToolDifficulty | null;
  free_trial: boolean | null;
  recommendation_status: AiToolRecommendationStatus | null;
  recommendation_reasons: string[];
  badge: string | null;
  click_count: number;
  is_favorite?: boolean;
  /** Set by public API — never use raw affiliate URLs in UI */
  go_url?: string;
  go_website_url?: string;
  is_top_tool?: boolean;
}

export interface AffiliateProgram extends ContentMeta, LinkFields {
  id: string;
  name: string;
  commission: string;
  cookie_duration: string;
  payout: string;
  category: string;
  notes: string | null;
  is_favorite?: boolean;
}

export type DownloadType = 'pdf' | 'template' | 'checklist' | 'notion' | 'canva';

export interface DownloadAsset extends ContentMeta {
  id: string;
  title: string;
  description: string;
  type: DownloadType;
  file_url: string | null;
  external_url: string | null;
}

export type VisibleTo = 'vault' | 'vip' | 'both';

export interface MonthlyDrop extends ContentMeta {
  id: string;
  title: string;
  month: string;
  description: string;
  image_url: string | null;
  release_date: string;
  items_included: string[];
  visible_to: VisibleTo;
}

export interface VaultUpdate extends ContentMeta {
  id: string;
  title: string;
  description: string;
}

export type WhatsNewResourceType =
  | 'prompt'
  | 'hook'
  | 'ai_tool'
  | 'affiliate_program'
  | 'download'
  | 'monthly_drop'
  | 'vault_update';

export interface WhatsNewItem {
  id: string;
  resource_type: WhatsNewResourceType;
  resource_id: string;
  title: string;
  description: string;
  created_at: string;
}

export interface Purchase {
  id: string;
  user_id: string | null;
  email: string;
  product: string;
  amount_cents: number;
  currency: string;
  status: 'pending' | 'completed' | 'refunded';
  created_at: string;
}

export interface OnboardingTaskId {
  quick_start: boolean;
  first_prompts: boolean;
  explore_tools: boolean;
  save_favorites: boolean;
  starter_pack: boolean;
  complete_profile: boolean;
}

export interface UserProgress {
  user_id: string;
  tasks: OnboardingTaskId;
  updated_at: string;
}

export interface CheckoutSession {
  id: string;
  amount_cents: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  product: 'builder_pass' | 'vault_lifetime';
}

export interface AdminStats {
  total_members: number;
  vault_members: number;
  vip_members: number;
  products_sold: number;
  conversion_rate: number | null;
  recent_signups: UserProfile[];
  recent_purchases: Purchase[];
}

export interface AnalyticsPlaceholders {
  most_viewed_tools: { name: string; views: number }[];
  most_copied_prompts: { title: string; copies: number }[];
  favorite_ai_tools: { name: string; saves: number }[];
}

export interface SearchResult {
  type: WhatsNewResourceType;
  id: string;
  title: string;
  description: string;
  href: string;
}

export type {
  AffiliateAsset,
  AffiliateAssetCategory,
  AffiliateAdminStats,
  AffiliateCampaignStub,
  AffiliateClick,
  AffiliateCommission,
  AffiliateDashboardStats,
  AffiliateLeaderboardEntry,
  AffiliateLink,
  AffiliatePayout,
  AffiliateProductSlug,
  AffiliateProfile,
  AffiliateReferral,
  AffiliateStatus,
  CommissionStatus,
  PartnerLevel,
  PayoutStatus,
} from './affiliate';

export function defaultContentMeta(): Pick<ContentMeta, keyof ContentMeta> {
  const now = new Date().toISOString();
  return {
    published: true,
    featured: false,
    draft: false,
    priority: 0,
    created_at: now,
    updated_at: now,
  };
}

export function defaultLinkFields(): LinkFields {
  return {
    website_url: '',
    affiliate_url: null,
    button_text: 'Visit',
    secondary_button_label: null,
  };
}

export function defaultAiToolFields(): Omit<AiTool, keyof ContentMeta | 'id'> {
  return {
    ...defaultLinkFields(),
    slug: '',
    name: '',
    description: '',
    pricing: '',
    category: 'writing',
    difficulty: null,
    free_trial: null,
    recommendation_status: null,
    recommendation_reasons: [],
    badge: null,
    click_count: 0,
  };
}

export function defaultOnboardingTasks(): OnboardingTaskId {
  return {
    quick_start: false,
    first_prompts: false,
    explore_tools: false,
    save_favorites: false,
    starter_pack: false,
    complete_profile: false,
  };
}

export function onboardingCompletionPercent(tasks: OnboardingTaskId): number {
  const keys = Object.keys(tasks) as (keyof OnboardingTaskId)[];
  const done = keys.filter((k) => tasks[k]).length;
  return Math.round((done / keys.length) * 100);
}
