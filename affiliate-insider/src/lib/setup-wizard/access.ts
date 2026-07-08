import { hasAdminAccess } from '@/lib/auth/permissions';
import type { UserProfile } from '@/types';

export const LESSON_1_HREF = '/vault/start';

export function hasCompletedSetupWizard(user: UserProfile | null): boolean {
  if (!user) return false;
  if (hasAdminAccess(user.role)) return true;
  return user.onboarding_completed_at !== null;
}
