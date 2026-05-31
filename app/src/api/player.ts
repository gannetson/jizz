import { apiUrl } from './baseUrl';
import { authService } from './services/auth.service';
import { BIRDR_JOURNEY_PLAYER_KEY } from './birdrJourney';

function collectStoredPlayerTokens(): string[] {
  const tokens = new Set<string>();
  for (const key of ['player-token', BIRDR_JOURNEY_PLAYER_KEY]) {
    try {
      const t = localStorage.getItem(key)?.trim();
      if (t) tokens.add(t);
    } catch {
      /* ignore */
    }
  }
  return [...tokens];
}

/** Link stored guest player token to the logged-in account (same as mobile). */
export async function linkStoredPlayerToAccount(): Promise<void> {
  await authService.ensureValidAccessToken();
  const accessToken = authService.getAccessToken();
  if (!accessToken) return;
  const playerTokens = collectStoredPlayerTokens();
  for (const playerToken of playerTokens) {
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
}
