'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { UserProfile } from '@/types';
import { getDemoUser, signIn, signOut, signUp, type SignInInput, type SignUpInput } from '@/lib/auth/client-auth';

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  signUp: (input: SignUpInput) => Promise<string | null>;
  signIn: (input: SignInInput) => Promise<string | null>;
  signOut: () => Promise<void>;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setUser(getDemoUser());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSignUp = async (input: SignUpInput) => {
    const { user: u, error } = await signUp(input);
    if (u) setUser(u);
    return error;
  };

  const handleSignIn = async (input: SignInInput) => {
    const { user: u, error } = await signIn(input);
    if (u) setUser(u);
    return error;
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp: handleSignUp,
        signIn: handleSignIn,
        signOut: handleSignOut,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
