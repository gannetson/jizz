import { apiUrl } from './config';

/** AsyncStorage key for the current player token (used by GameContext and link on login). */
export const PLAYER_TOKEN_STORAGE_KEY = 'player-token';

export type Player = {
  id: number;
  token: string;
  name: string;
  language: string;
};

/**
 * Create a player. When accessToken is provided (user logged in), the backend links the player to the user account.
 */
export async function createPlayer(
  name: string,
  language: string,
  accessToken?: string | null
): Promise<Player | null> {
  const headers: HeadersInit = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (accessToken?.trim()) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken.trim()}`;
  }
  const response = await fetch(apiUrl('/api/player/'), {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, language }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data as Player;
}

export async function getPlayer(token: string): Promise<Player | null> {
  const response = await fetch(apiUrl(`/api/player/${token}/`), {
    method: 'GET',
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data as Player;
}

/**
 * Link an existing player (by token) to the currently logged-in user. Call after login.
 */
export async function linkPlayerToAccount(
  accessToken: string,
  playerToken: string
): Promise<boolean> {
  const response = await fetch(apiUrl('/api/player/link/'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ player_token: playerToken }),
  });
  return response.ok;
}
