import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authApi from '../api/auth';
import * as playerApi from '../api/player';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username?: string) => Promise<void>;
  loginWithGoogle: () => Promise<boolean>;
  loginWithApple: () => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  handleOAuthRedirect: (url: string) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * After login/sign-up: if the user had been playing anonymously (we have a stored player token),
 * link that player to their account so progress is kept. If there is no stored player token
 * (e.g. they signed up before ever playing), we do nothing — when they create a player later
 * via createPlayer(..., accessToken), the backend already links it (POST /api/player/ with Auth).
 */
async function linkStoredPlayerToAccount(): Promise<void> {
  try {
    const accessToken = await authApi.ensureFreshAccessToken();
    const playerToken = (await AsyncStorage.getItem(playerApi.PLAYER_TOKEN_STORAGE_KEY))?.trim();
    if (accessToken && playerToken && playerToken.length >= 4) {
      await playerApi.linkPlayerToAccount(accessToken, playerToken);
    }
  } catch {
    // Non-fatal: player stays unlinked
  }
}

function parseOAuthRedirect(url: string): { provider: 'google-oauth2' | 'apple-id'; code?: string; access_token?: string; refresh_token?: string } | null {
  try {
    if (!url || !url.startsWith('birdr://auth/')) return null;
    const parsed = new URL(url);
    const path = parsed.pathname || '';
    const provider = path.includes('apple') ? 'apple-id' : path.includes('google') ? 'google-oauth2' : null;
    if (!provider) return null;
    const code = parsed.searchParams.get('code') ?? undefined;
    const access_token = parsed.searchParams.get('access_token') ?? undefined;
    const refresh_token = parsed.searchParams.get('refresh_token') ?? undefined;
    return { provider: provider as 'google-oauth2' | 'apple-id', code, access_token, refresh_token };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const hadAnyToken = !!(await authApi.getAccessToken()) || !!(await authApi.getRefreshToken());
      if (!hadAnyToken) {
        setIsAuthenticated(false);
        return;
      }
      const access = await authApi.ensureFreshAccessToken();
      setIsAuthenticated(!!access);
    } catch {
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleOAuthRedirect = useCallback(async (url: string): Promise<boolean> => {
    const parsed = parseOAuthRedirect(url);
    if (!parsed) return false;
    try {
      if (parsed.access_token && parsed.refresh_token) {
        await authApi.storeTokens({ access: parsed.access_token, refresh: parsed.refresh_token });
      } else if (parsed.code) {
        const tokens = await authApi.convertOAuthToken(parsed.code, parsed.provider);
        await authApi.storeTokens(tokens);
      } else {
        return false;
      }
      setIsAuthenticated(true);
      linkStoredPlayerToAccount();
      return true;
    } catch {
      return false;
    }
  }, []);

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      const tokens = await authApi.loginWithEmail(email, password);
      await authApi.storeTokens(tokens);
      setIsAuthenticated(true);
      linkStoredPlayerToAccount();
    },
    []
  );

  const register = useCallback(
    async (email: string, password: string, username?: string) => {
      const tokens = await authApi.register(email, password, username);
      await authApi.storeTokens(tokens);
      setIsAuthenticated(true);
      linkStoredPlayerToAccount();
    },
    []
  );

  const loginWithGoogle = useCallback(async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }
      // Sign out first so the next signIn() shows the account picker (allows switching Google accounts)
      try {
        await GoogleSignin.signOut();
      } catch {
        // Ignore
      }
      const result = await GoogleSignin.signIn();
      if (result.type !== 'success' || !result.data?.idToken) {
        if (result.type === 'cancelled') return false;
        throw new Error('Google Sign-In failed or missing ID token. Ensure GOOGLE_WEB_CLIENT_ID is set.');
      }
      const tokens = await authApi.loginWithGoogleToken(result.data.idToken);
      await authApi.storeTokens(tokens);
      setIsAuthenticated(true);
      linkStoredPlayerToAccount();
      return true;
    } catch (e: any) {
      throw e;
    }
  }, []);
  const loginWithApple = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'ios') {
      // Android: use web OAuth flow from LoginScreen (openSocialLogin('apple-id'))
      return false;
    }
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        throw new Error('Apple Sign In did not return an identity token.');
      }
      const tokens = await authApi.loginWithAppleToken(credential.identityToken, {
        email: credential.email ?? undefined,
        fullName: credential.fullName
          ? {
              givenName: credential.fullName.givenName ?? undefined,
              familyName: credential.fullName.familyName ?? undefined,
            }
          : undefined,
      });
      await authApi.storeTokens(tokens);
      setIsAuthenticated(true);
      linkStoredPlayerToAccount();
      return true;
    } catch (e: any) {
      if (e?.code === 'ERR_REQUEST_CANCELED') {
        return false;
      }
      // Error 1000 / -7026 often occur on Simulator; Sign in with Apple is unreliable there
      if (e?.code === 'ERR_REQUEST_UNKNOWN') {
        throw new Error(
          'Apple Sign In failed. If you’re on the Simulator, try a real device. Otherwise check that you’re signed into an Apple ID in Settings and that the app has Sign in with Apple enabled.'
        );
      }
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await GoogleSignin.signOut();
    } catch {
      // Ignore: user may not have signed in with Google
    }
    try {
      await GoogleSignin.revokeAccess();
    } catch {
      // Ignore
    }
    await authApi.clearTokens();
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        loginWithEmail,
        register,
        loginWithGoogle,
        loginWithApple,
        logout,
        checkAuth,
        handleOAuthRedirect,
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
