import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { authService } from '../api/services/auth.service';
import { profileService, type UserProfile } from '../api/services/profile.service';

const AUTH_STORAGE_KEYS = ['access_token', 'refresh_token', 'jw_token'];
const ACCESS_REFRESH_SKEW_SEC = 120;

type AuthProfileState = {
  isAuthenticated: boolean;
  profile: UserProfile | null;
  userEmail: string | null;
  refresh: () => Promise<void>;
};

const AuthProfileContext = createContext<AuthProfileState>({
  isAuthenticated: false,
  profile: null,
  userEmail: null,
  refresh: async () => {},
});

function jwtExp(accessToken: string): number | null {
  try {
    const payload = accessToken.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const data = JSON.parse(atob(padded)) as { exp?: number; email?: string; username?: string };
    return typeof data.exp === 'number' ? data.exp : null;
  } catch {
    return null;
  }
}

function jwtEmail(accessToken: string): string | null {
  try {
    const payload = accessToken.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const data = JSON.parse(atob(padded)) as { email?: string; username?: string };
    return data.email || data.username || null;
  } catch {
    return null;
  }
}

export function AuthProfileProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const expiryTimerRef = useRef<number | undefined>(undefined);

  const refresh = useCallback(async () => {
    const token = authService.getAccessToken();
    if (!token) {
      setIsAuthenticated(false);
      setUserEmail(null);
      setProfile(null);
      return;
    }
    const ok = await authService.ensureValidAccessToken();
    const access = authService.getAccessToken();
    if (!ok || !access) {
      setIsAuthenticated(false);
      setUserEmail(null);
      setProfile(null);
      return;
    }
    setIsAuthenticated(true);
    setUserEmail(jwtEmail(access));
    try {
      const profileData = await profileService.getProfile();
      setProfile(profileData);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const onStorage = (event: StorageEvent) => {
      if (!event.key || AUTH_STORAGE_KEYS.includes(event.key)) void refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('storage', onStorage);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('storage', onStorage);
    };
  }, [refresh]);

  useEffect(() => {
    if (expiryTimerRef.current) {
      window.clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = undefined;
    }
    if (document.visibilityState !== 'visible') return;
    const access = authService.getAccessToken();
    if (!access) return;
    const exp = jwtExp(access);
    if (exp == null) return;
    const now = Math.floor(Date.now() / 1000);
    const delayMs = (exp - ACCESS_REFRESH_SKEW_SEC - now) * 1000;
    if (delayMs <= 0 || delayMs > 24 * 60 * 60 * 1000) return;
    expiryTimerRef.current = window.setTimeout(() => {
      void refresh();
    }, delayMs);
    return () => {
      if (expiryTimerRef.current) window.clearTimeout(expiryTimerRef.current);
    };
  }, [isAuthenticated, refresh]);

  return (
    <AuthProfileContext.Provider value={{ isAuthenticated, profile, userEmail, refresh }}>
      {children}
    </AuthProfileContext.Provider>
  );
}

export function useAuthProfile(): AuthProfileState {
  return useContext(AuthProfileContext);
}

export default AuthProfileContext;
