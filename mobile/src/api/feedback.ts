import { apiUrl } from './config';
import { getAuthHeaders } from './auth';

export async function postFeedback(
  comment: string,
  playerToken?: string | null
): Promise<boolean> {
  const headers = (await getAuthHeaders()) as Record<string, string>;
  headers['Content-Type'] = 'application/json';
  const body: Record<string, string> = { comment: comment.trim() };
  if (playerToken?.trim()) {
    body.player_token = playerToken.trim();
  }
  const response = await fetch(apiUrl('/api/feedback/'), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return response.ok;
}
