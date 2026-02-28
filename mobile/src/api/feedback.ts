import { apiUrl } from './config';

export async function postFeedback(
  rating: number,
  comment: string,
  playerToken: string | null
): Promise<boolean> {
  const response = await fetch(apiUrl('/api/feedback/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating, comment, player_token: playerToken }),
  });
  return response.ok;
}
