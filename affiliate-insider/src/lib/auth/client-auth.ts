import type { UserProfile, UserRole } from '@/types';
import { createClient } from '@/lib/supabase/client';

const DEMO_USER_KEY = 'ai_vault_demo_user';

export interface SignUpInput {
  email: string;
  password: string;
  fullName: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

function demoUser(email: string, fullName: string): UserProfile {
  return {
    id: `demo_${Date.now()}`,
    email,
    full_name: fullName,
    role: 'VAULT_MEMBER',
    avatar_url: null,
    created_at: new Date().toISOString(),
    onboarding_completed_at: null,
    preferred_ai_chat: null,
  };
}

export async function signUp(input: SignUpInput): Promise<{ user: UserProfile | null; error: string | null }> {
  const supabase = createClient();

  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { full_name: input.fullName, role: 'VAULT_MEMBER' },
      },
    });

    if (error) return { user: null, error: error.message };

    if (data.user) {
      return {
        user: {
          id: data.user.id,
          email: data.user.email ?? input.email,
          full_name: input.fullName,
          role: 'VAULT_MEMBER',
          avatar_url: null,
          created_at: data.user.created_at,
          onboarding_completed_at: null,
          preferred_ai_chat: null,
        },
        error: null,
      };
    }
    return { user: null, error: 'Account created — check your email to confirm.' };
  }

  const user = demoUser(input.email, input.fullName);
  if (typeof window !== 'undefined') {
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(user));
  }
  return { user, error: null };
}

export async function signIn(input: SignInInput): Promise<{ user: UserProfile | null; error: string | null }> {
  const supabase = createClient();

  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) return { user: null, error: error.message };

    const role = (data.user?.user_metadata?.role as UserRole) ?? 'VAULT_MEMBER';
    return {
      user: {
        id: data.user!.id,
        email: data.user!.email ?? input.email,
        full_name: data.user!.user_metadata?.full_name ?? null,
        role,
        avatar_url: data.user!.user_metadata?.avatar_url ?? null,
        created_at: data.user!.created_at,
        onboarding_completed_at: data.user!.user_metadata?.onboarding_completed_at ?? null,
        preferred_ai_chat: data.user!.user_metadata?.preferred_ai_chat ?? null,
      },
      error: null,
    };
  }

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(DEMO_USER_KEY);
    if (raw) {
      return { user: JSON.parse(raw) as UserProfile, error: null };
    }
  }
  return { user: demoUser(input.email, input.email.split('@')[0]), error: null };
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DEMO_USER_KEY);
  }
}

export function getDemoUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(DEMO_USER_KEY);
  return raw ? (JSON.parse(raw) as UserProfile) : null;
}

export function setDemoUserAfterPurchase(email: string): UserProfile {
  const user = demoUser(email, email.split('@')[0]);
  if (typeof window !== 'undefined') {
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(user));
    localStorage.setItem('ai_vault_purchased', 'true');
  }
  return user;
}

export function hasPurchased(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('ai_vault_purchased') === 'true';
}
