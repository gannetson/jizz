import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { apiUrl } from './config';

const SESSION_KEY = 'birdr_analytics_sid';
let lastTrackedPath = '';
let lastTrackedAt = 0;

async function getSessionId(): Promise<string> {
  try {
    let sid = await AsyncStorage.getItem(SESSION_KEY);
    if (!sid) {
        sid = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        await AsyncStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return 'anonymous';
  }
}

export async function trackScreenView(path: string, countryCode?: string): Promise<void> {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const now = Date.now();
  if (normalized === lastTrackedPath && now - lastTrackedAt < 2000) {
    return;
  }
  lastTrackedPath = normalized;
  lastTrackedAt = now;

  const sessionKey = await getSessionId();
  const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

  fetch(apiUrl('/api/analytics/event/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path: normalized,
      event_type: 'page_view',
      platform,
      session_key: sessionKey,
      country_code: countryCode || '',
    }),
  }).catch(() => {});
}

export async function trackFeature(path: string, metadata?: Record<string, unknown>, countryCode?: string): Promise<void> {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const sessionKey = await getSessionId();
  const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

  fetch(apiUrl('/api/analytics/event/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path: normalized,
      event_type: 'feature',
      platform,
      session_key: sessionKey,
      country_code: countryCode || '',
      metadata: metadata || {},
    }),
  }).catch(() => {});
}
