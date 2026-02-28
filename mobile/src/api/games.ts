import { apiUrl } from './config';
import type { Country } from './countries';
import type { Player } from './player';

export type Game = {
  token: string;
  level: string;
  length: number | string;
  media: string;
  country: Country;
  language: string;
  host?: { id: number; name: string; token?: string };
  ended?: boolean;
  current_highscore?: { name: string; score?: number };
  scores?: Array<{ name: string; score?: number; ranking?: number }>;
};

type CreateGameBody = {
  multiplayer: boolean;
  country: string;
  language: string;
  level: string;
  length: string;
  media: string;
  include_rare?: boolean;
  include_escapes?: boolean;
  tax_order?: string;
  tax_family?: string;
};

const GAME_REQUEST_TIMEOUT_MS = 30000;

export async function createGame(
  playerToken: string,
  body: CreateGameBody
): Promise<Game | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GAME_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(apiUrl('/api/games/'), {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${playerToken}`,
      },
      body: JSON.stringify(body),
    });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const data = await response.json();
    return data as Game;
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

export async function loadGame(token: string): Promise<Game | null> {
  const response = await fetch(apiUrl(`/api/games/${encodeURIComponent(token)}/`), {
    method: 'GET',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data as Game;
}
