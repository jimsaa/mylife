import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { profileApi } from '../api';
import type { ProfileSettings } from '../types';

interface ProfileContextValue {
  profile: ProfileSettings | null;
  setProfile: (profile: ProfileSettings) => void;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileSettings | null>(null);

  const refreshProfile = useCallback(async () => {
    const data = await profileApi.get();
    setProfile(data);
  }, []);

  useEffect(() => {
    refreshProfile().catch(console.error);
  }, [refreshProfile]);

  return (
    <ProfileContext.Provider value={{ profile, setProfile, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within ProfileProvider');
  }
  return context;
}
