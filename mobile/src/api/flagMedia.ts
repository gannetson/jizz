import { apiUrl } from './config';
import { getAuthHeaders } from './auth';

export type FlagMediaPayload = {
  media_id: number;
  player_token?: string;
  description: string;
};

/** POST to /api/flag-media/ (standalone flag). Requires player_token from game. */
export async function flagMedia(
  mediaId: number,
  playerToken: string,
  description: string
): Promise<void> {
  const headers = await getAuthHeaders();
  const body = {
    media_id: mediaId,
    player_token: playerToken,
    description,
  };
  const response = await fetch(apiUrl('/api/flag-media/'), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('Failed to flag media');
}

/**
 * Submit as review-media with review_type 'rejected' (used from game – same as React "useMediaReview").
 * When user is authenticated, omit player_token and backend uses request.user.
 */
export async function flagMediaAsReview(
  mediaId: number,
  playerToken: string | undefined,
  description: string
): Promise<void> {
  const headers = await getAuthHeaders();
  const body: Record<string, unknown> = {
    media_id: mediaId,
    review_type: 'rejected',
    description,
  };
  if (playerToken != null) body.player_token = playerToken;
  const response = await fetch(apiUrl('/api/review-media/'), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('Failed to flag media');
}
