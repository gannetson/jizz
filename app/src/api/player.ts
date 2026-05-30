import { apiUrl } from './baseUrl';
import { authService } from './services/auth.service';

/** Link stored guest player token to the logged-in account (same as mobile). */
export async function linkStoredPlayerToAccount(): Promise<void> {
  const accessToken = authService.getAccessToken();
  const playerToken = localStorage.getItem('player-token')?.trim();
  if (!accessToken || !playerToken) return;
  try {
    await fetch(apiUrl('/api/player/link/'), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ player_token: playerToken }),
    });
  } catch {
    /* non-fatal */
  }
}
