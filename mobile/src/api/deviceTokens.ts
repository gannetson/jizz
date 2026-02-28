import { apiUrl } from './config';
import { getAuthHeaders } from './auth';

/**
 * Register push notification device token with the backend.
 * Call this after obtaining a token from expo-notifications or FCM.
 * When expo-notifications is not installed, pass null and this is a no-op.
 */
export async function registerDeviceToken(
  token: string | null,
  platform: 'ios' | 'android'
): Promise<void> {
  if (!token) return;
  const headers = await getAuthHeaders();
  await fetch(apiUrl('/api/device-tokens/'), {
    method: 'POST',
    headers: { ...(headers as Record<string, string>), 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, platform }),
  });
}
