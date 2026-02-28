import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { getProfile, getAvatarUrl, type UserProfile } from '../api/profile';
import { useAuth } from './AuthContext';

type ProfileContextType = {
  profile: UserProfile | null;
  avatarUrl: string | null;
  initials: string;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

function deriveInitials(profile: UserProfile | null): string {
  if (!profile) return '';
  if (profile.first_name && profile.last_name) {
    return (profile.first_name[0] + profile.last_name[0]).toUpperCase();
  }
  if (profile.username) {
    return profile.username.slice(0, 2).toUpperCase();
  }
  if (profile.email) {
    return profile.email[0].toUpperCase();
  }
  return '?';
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshProfile = useCallback(async () => {
    setLoading(true);
    try {
      const p = await getProfile();
      setProfile(p);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      refreshProfile();
    } else {
      setProfile(null);
    }
  }, [isAuthenticated, refreshProfile]);

  const avatarUrl = getAvatarUrl(profile);
  const initials = deriveInitials(profile);

  return (
    <ProfileContext.Provider value={{ profile, avatarUrl, initials, loading, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
