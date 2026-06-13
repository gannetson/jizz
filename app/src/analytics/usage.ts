import { apiUrl } from '../api/baseUrl';

const SESSION_KEY = 'birdr_analytics_sid';
let lastTrackedPath = '';
let lastTrackedAt = 0;

function getSessionId(): string {
  try {
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return 'anonymous';
  }
}

function getPlatform(): 'web' | 'ios' | 'android' {
  if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
    const native = window.Capacitor.getPlatform?.();
    if (native === 'ios' || native === 'android') {
      return native;
    }
  }
  return 'web';
}

export function trackPageView(path: string, countryCode?: string): void {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const now = Date.now();
  if (normalized === lastTrackedPath && now - lastTrackedAt < 2000) {
    return;
  }
  lastTrackedPath = normalized;
  lastTrackedAt = now;

  const body = JSON.stringify({
    path: normalized,
    event_type: 'page_view',
    platform: getPlatform(),
    session_key: getSessionId(),
    country_code: countryCode || '',
  });

  const url = apiUrl('/api/analytics/event/');
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    return;
  }

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}

export function trackFeature(path: string, metadata?: Record<string, unknown>, countryCode?: string): void {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const body = JSON.stringify({
    path: normalized,
    event_type: 'feature',
    platform: getPlatform(),
    session_key: getSessionId(),
    country_code: countryCode || '',
    metadata: metadata || {},
  });

  fetch(apiUrl('/api/analytics/event/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}
