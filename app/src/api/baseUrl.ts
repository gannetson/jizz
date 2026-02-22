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
