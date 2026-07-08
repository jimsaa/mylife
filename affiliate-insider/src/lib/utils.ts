import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export { hasVaultAccess, hasAdminAccess } from '@/lib/auth/permissions';
