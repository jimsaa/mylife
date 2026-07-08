import { hasAdminAccess, hasVaultAccess } from '@/lib/auth/permissions';
import type { Purchase, UserProfile } from '@/types';

const PAYING_PRODUCTS = new Set(['vault_lifetime', 'builder_pass', 'ai_income_builder']);

export function isPayingCustomer(
  user: Pick<UserProfile, 'id' | 'email'>,
  purchases: Purchase[]
): boolean {
  const email = user.email.toLowerCase();
  return purchases.some(
    (p) =>
      p.status === 'completed' &&
      PAYING_PRODUCTS.has(p.product) &&
      (p.user_id === user.id || p.email.toLowerCase() === email)
  );
}

/** Only paying Builder Pass customers (or admin for testing) */
export function hasAffiliateCenterAccess(
  user: UserProfile | null,
  purchases: Purchase[]
): boolean {
  if (!user) return false;
  if (hasAdminAccess(user.role)) return true;
  if (!hasVaultAccess(user.role)) return false;
  return isPayingCustomer(user, purchases);
}
