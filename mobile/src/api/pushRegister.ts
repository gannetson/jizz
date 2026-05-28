import { apiUrl } from './config';
import { getAuthHeaders } from './auth';

export type PushRegisterPayload = {
  expo_push_token: string;
  timezone: string;
  platform: 'ios' | 'android';
};

export type PushRegisterResponse = {
  id: number;
  expo_push_token: string;
  platform: string;
  enabled: boolean;
  test_push_sent?: boolean;
};

export async function registerPushWithBackend(
  payload: PushRegisterPayload
): Promise<PushRegisterResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(apiUrl('/api/mobile/push/register/'), {
    method: 'POST',
    headers: headers as Record<string, string>,
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg =
      (data as { error?: string; detail?: string }).error ??
      (data as { detail?: string }).detail ??
      `Push registration failed (${response.status})`;
    throw new Error(typeof msg === 'string' ? msg : 'Push registration failed');
  }
  return data as PushRegisterResponse;
}
