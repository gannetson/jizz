import { apiUrl } from './config';
import type { Country } from './countries';
import type { Player } from './player';
import type { Question } from '../types/game';

export type GameScore = {
  id?: number;
  name: string;
  score?: number;
  ranking?: number;
  is_host?: boolean;
};

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
  scores?: GameScore[];
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

/**
 * Get the current (active) question for an MPG game.
 * Used when we receive game_started so we can show the first question even if new_question was missed.
 */
export async function getCurrentQuestion(gameToken: string): Promise<Question | null> {
  const response = await fetch(apiUrl(`/api/games/${encodeURIComponent(gameToken)}/question`), {
    method: 'GET',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  });
  if (!response.ok) return null;
  const data = await response.json();
  if (!data?.id) return null;
  // If API includes game.token, it must match (otherwise ignore). Missing token still allowed for fallback fetch.
  if (data.game?.token != null && String(data.game.token) !== String(gameToken)) return null;
  return data as Question;
}

/** Tell the server primary media has loaded so score timing starts from now (not question.created). */
export async function postQuestionMediaReady(questionId: number, playerToken: string): Promise<void> {
  const response = await fetch(apiUrl(`/api/questions/${questionId}/media-ready/`), {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ player_token: playerToken }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const msg = data.error ?? data.detail ?? 'media-ready failed';
    throw new Error(typeof msg === 'string' ? msg : 'media-ready failed');
  }
}
