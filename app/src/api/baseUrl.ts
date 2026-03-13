/**
 * Central API base URL for all requests.
 * When running in Capacitor (Android/iOS), the app origin is capacitor://localhost,
 * so we must use the production API URL. On web, use same origin or REACT_APP_API_URL.
 */
declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      getPlatform: () => string;
    };
  }
}

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.REACT_APP_API_URL || 'https://birdr.pro';
  }
  // Capacitor: app runs from capacitor://localhost; API must be absolute
  if (window.Capacitor?.isNativePlatform?.()) {
    return process.env.REACT_APP_API_URL || 'https://birdr.pro';
  }
  return process.env.REACT_APP_API_URL || window.location.origin;
}

/**
 * Base URL for the OAuth start (e.g. /auth/login/google-oauth2/).
 * Must be the same host that receives the OAuth callback, so the session cookie is sent.
 * In local dev we use the backend URL directly so login and callback both hit the same origin.
 */
export function getSocialLoginBaseUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.REACT_APP_API_URL || 'https://birdr.pro';
  }
  if (window.Capacitor?.isNativePlatform?.()) {
    return process.env.REACT_APP_API_URL || 'https://birdr.pro';
  }
  const isLocalDev =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocalDev) {
    return process.env.REACT_APP_API_URL || 'http://127.0.0.1:8050';
  }
  return getApiBaseUrl();
}

/** Full URL for an API path (e.g. apiUrl('/api/player/') for fetch and relative paths). */
export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const p = path.startsWith('/') ? path : `/${path}`;
  return base + p;
}

/** WebSocket URL for the same host as the API (ws in dev, wss in production/Capacitor). */
export function getWebSocketUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (typeof window !== 'undefined' && window.location.host === 'localhost:3000') {
    return `ws://127.0.0.1:8050${p}`;
  }
  const base = getApiBaseUrl();
  const wsBase = base.replace(/^https/, 'wss').replace(/^http/, 'ws');
  return wsBase + p;
}
