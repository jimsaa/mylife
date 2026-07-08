import type { UserProfile, UserRole } from '@/types';

export function hasVaultAccess(role: UserRole | string): boolean {
  return role === 'VAULT_MEMBER' || role === 'VIP_MEMBER' || role === 'ADMIN';
}

export function hasAdminAccess(role: UserRole | string): boolean {
  return role === 'ADMIN';
}

export function isAdminEmail(email: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@jimsaari.se';
  return email.toLowerCase() === adminEmail.toLowerCase();
}

export function resolveRoleForEmail(email: string, requested?: UserRole): UserRole {
  if (isAdminEmail(email)) return 'ADMIN';
  return requested ?? 'VAULT_MEMBER';
}

export function canAccessSession(user: UserProfile | null): boolean {
  return !!user && (hasVaultAccess(user.role) || hasAdminAccess(user.role));
}
