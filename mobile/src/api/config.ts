import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;

/** Override with EXPO_PUBLIC_API_URL in mobile/.env for local Django (e.g. http://10.0.2.2:8000). */
export const API_BASE_URL = (extra?.apiBaseUrl || 'https://birdr.pro').replace(/\/$/, '');

/**
 * Web OAuth 2.0 client ID from Google Console (type "Web application").
 * This is NOT the Android client ID — it's the *web* client ID that the Android app
 * sends to GoogleSignin.configure({ webClientId }) so that Google returns an idToken.
 */
export const GOOGLE_WEB_CLIENT_ID = '56451813101-pab6limmhoe0tqhtf0oel1tht3ja0rqq.apps.googleusercontent.com';

/**
 * iOS OAuth client ID from Google Console (type "iOS").
 * Required for Google Sign-In on iOS; pass as iosClientId to GoogleSignin.configure().
 */
export const GOOGLE_IOS_CLIENT_ID = '56451813101-kkjv7e0agsujmmtuuq5gs6mdkumdmp71.apps.googleusercontent.com';

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${p}`;
}

/** WebSocket URL for game (wss on production). */
export function getWebSocketUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const wsBase = API_BASE_URL.replace(/^https/, 'wss').replace(/^http/, 'ws');
  return `${wsBase}${p}`;
}

/** Resolve API media paths (/media/...) or upgrade http→https for journey icons, avatars, etc. */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('http://')) return `https://${trimmed.slice(7)}`;
  if (trimmed.startsWith('/')) return apiUrl(trimmed);
  return trimmed;
}
