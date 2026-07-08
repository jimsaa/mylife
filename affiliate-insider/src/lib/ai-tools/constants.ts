import type { AiToolCategory } from '@/types';

export const AI_TOOL_CATEGORIES: AiToolCategory[] = [
  'ai_builder',
  'writing',
  'video',
  'image',
  'automation',
  'analytics',
  'seo',
];

export const AI_TOOL_CATEGORY_LABELS: Record<AiToolCategory | 'all', string> = {
  all: 'All',
  ai_builder: 'AI Builder',
  writing: 'Writing',
  video: 'Video',
  image: 'Image',
  automation: 'Automation',
  analytics: 'Analytics',
  seo: 'SEO',
};

export const AI_TOOL_DIFFICULTY_LABELS = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
} as const;
