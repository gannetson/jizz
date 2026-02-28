export const API_BASE_URL = 'https://birdr.pro';

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
  return API_BASE_URL + p;
}

/** WebSocket URL for game (wss on production). */
export function getWebSocketUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const base = API_BASE_URL;
  const wsBase = base.replace(/^https/, 'wss').replace(/^http/, 'ws');
  return wsBase + p;
}
