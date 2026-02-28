import { apiUrl } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export type TokenResponse = {
  access: string;
  refresh: string;
  access_token?: string;
  refresh_token?: string;
};

export type AuthError = { message: string; details?: unknown };

function getStored(key: string): Promise<string | null> {
  return AsyncStorage.getItem(key);
}

export async function loginWithEmail(email: string, password: string): Promise<TokenResponse> {
  const response = await fetch(apiUrl('/token/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: email, password }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data.detail ?? data.error ?? data.message ?? 'Login failed';
    throw { message: typeof msg === 'string' ? msg : 'Login failed' };
  }
  return {
    access: data.access,
    refresh: data.refresh,
  };
}

export async function register(
  email: string,
  password: string,
  username?: string
): Promise<TokenResponse> {
  const response = await fetch(apiUrl('/api/register/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      username: username || email,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data.detail ?? data.error ?? data.message ?? 'Registration failed';
    throw { message: typeof msg === 'string' ? msg : 'Registration failed' };
  }
  return {
    access: data.access,
    refresh: data.refresh,
  };
}

export function getSocialLoginUrl(
  provider: 'google-oauth2' | 'apple-id',
  redirectUri: string
): string {
  return `${apiUrl('/auth/login/' + provider + '/')}?redirect_uri=${encodeURIComponent(redirectUri)}`;
}

export async function convertOAuthToken(
  code: string,
  provider: 'google-oauth2' | 'apple-id'
): Promise<TokenResponse> {
  const response = await fetch(apiUrl('/token/convert-token/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'convert_token',
      backend: provider,
      token: code,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data.detail ?? data.error ?? data.message ?? 'Authentication failed';
    throw { message: typeof msg === 'string' ? msg : 'Authentication failed' };
  }
  return {
    access: data.access_token ?? data.access,
    refresh: data.refresh_token ?? data.refresh,
  };
}

/** Log in with a Google ID token (from native in-app Google Sign-In). Stays in-app, no browser. */
export async function loginWithGoogleToken(idToken: string): Promise<TokenResponse> {
  const response = await fetch(apiUrl('/api/google-login/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: idToken }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data.error ?? data.detail ?? data.message ?? 'Google sign-in failed';
    if (__DEV__) {
      console.error('[Google login API]', response.status, data);
    }
    throw { message: typeof msg === 'string' ? msg : 'Google sign-in failed' };
  }
  return {
    access: data.access,
    refresh: data.refresh,
  };
}

export async function storeTokens(tokens: TokenResponse): Promise<void> {
  await AsyncStorage.multiSet([
    [ACCESS_TOKEN_KEY, tokens.access],
    [REFRESH_TOKEN_KEY, tokens.refresh],
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return getStored(ACCESS_TOKEN_KEY);
}

/** Returns headers with Bearer token for authenticated API calls. */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function getRefreshToken(): Promise<string | null> {
  return getStored(REFRESH_TOKEN_KEY);
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
}

export async function isAuthenticated(): Promise<boolean> {
  const t = await getAccessToken();
  return !!t;
}
