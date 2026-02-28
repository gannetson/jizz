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

export async function createGame(
  playerToken: string,
  body: CreateGameBody
): Promise<Game | null> {
  const response = await fetch(apiUrl('/api/games/'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Token ${playerToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data as Game;
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
