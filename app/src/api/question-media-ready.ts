import { getApiBaseUrl } from './baseUrl';

/** Tell the server primary media has loaded so score timing uses ready_at (same as mobile). */
export async function postQuestionMediaReady(questionId: number, playerToken: string): Promise<void> {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const response = await fetch(`${base}/api/questions/${questionId}/media-ready/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ player_token: playerToken }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const msg = (data as { error?: string; detail?: string }).error ?? (data as { detail?: string }).detail ?? 'media-ready failed';
    throw new Error(typeof msg === 'string' ? msg : 'media-ready failed');
  }
}
