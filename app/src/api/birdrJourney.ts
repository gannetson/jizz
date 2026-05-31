import { apiUrl } from './baseUrl';
import { authService } from './services/auth.service';
import type { Answer, Question } from '../core/app-context';

export type CountryRef = { code: string; name: string };

export type JourneyStepStatus = 'completed' | 'current' | 'locked';

export type JourneyStep = {
  id: number;
  sequence: number;
  step_type: string;
  level: string;
  length: number;
  jokers: number;
  rarity: string;
  include_escapes?: boolean;
  media: string;
  tax_order?: string | null;
  status: JourneyStepStatus;
};

export type JourneyLevel = {
  sequence: number;
  title: string;
  description: string;
  title_nl?: string;
  description_nl?: string;
  icon_url: string | null;
  is_champion: boolean;
  steps: JourneyStep[];
};

export type JourneyGameRef = {
  token: string;
  level: string;
  length: number;
  media: string;
  ended?: boolean;
  scores?: Array<{ answers?: Array<{ sequence?: number; correct?: boolean }> }>;
};

export type BirdrJourneyGame = {
  id: number;
  journey_step: JourneyStep;
  game: JourneyGameRef;
  status: 'new' | 'running' | 'passed' | 'failed';
  remaining_jokers: number;
  created: string;
};

export type BirdrJourney = {
  id: number;
  country: CountryRef;
  player_token?: string | null;
  current_sequence: number;
  current_step_sequence: number;
  streak_days: number;
  last_played_date: string | null;
  can_play_today: boolean;
  is_champion: boolean;
  pending_level_celebration: boolean;
  current_level: JourneyLevel | null;
  next_level: JourneyLevel | null;
  active_step: JourneyStep | null;
  current_game: BirdrJourneyGame | null;
  created: string;
  updated: string;
};

export type StartStepResponse = {
  journey: BirdrJourney;
  journey_game: BirdrJourneyGame;
};

export type CompleteStepResponse = {
  journey: BirdrJourney;
  level_complete: boolean;
  status: string;
};

const BIRDR_JOURNEY_COUNTRY_KEY = 'birdr_journey_country_code';

function parseError(data: Record<string, unknown>, fallback: string): string {
  const msg = data.detail ?? data.error ?? data.message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return fallback;
}

export function getStoredBirdrJourneyCountryCode(): string | null {
  try {
    return localStorage.getItem(BIRDR_JOURNEY_COUNTRY_KEY);
  } catch {
    return null;
  }
}

export function setStoredBirdrJourneyCountryCode(code: string): void {
  try {
    localStorage.setItem(BIRDR_JOURNEY_COUNTRY_KEY, code.trim().toUpperCase());
  } catch {
    /* ignore */
  }
}

function persistJourneyCountry(journey: BirdrJourney | null | undefined): void {
  const code = journey?.country?.code?.trim();
  if (code) setStoredBirdrJourneyCountryCode(code);
}

export const BIRDR_JOURNEY_PLAYER_KEY = 'birdr_journey_player_token';

export function getStoredBirdrJourneyPlayerToken(): string | null {
  try {
    return localStorage.getItem(BIRDR_JOURNEY_PLAYER_KEY);
  } catch {
    return null;
  }
}

export function setStoredBirdrJourneyPlayerToken(token: string): void {
  try {
    localStorage.setItem(BIRDR_JOURNEY_PLAYER_KEY, token);
    localStorage.setItem('player-token', token);
  } catch {
    /* ignore */
  }
}

export async function syncBirdrJourneyPlayerToken(
  journey: BirdrJourney | null | undefined
): Promise<string | null> {
  persistJourneyCountry(journey);
  const token = journey?.player_token?.trim();
  if (!token) return getStoredBirdrJourneyPlayerToken();
  setStoredBirdrJourneyPlayerToken(token);
  return token;
}

export function isBirdrJourneyInProgress(journey: BirdrJourney): boolean {
  return !journey.is_champion;
}

function canQueryBirdrJourney(): boolean {
  if (authService.getAccessToken()) return true;
  return !!(getStoredBirdrJourneyPlayerToken() || localStorage.getItem('player-token'));
}

export async function findInProgressBirdrJourney(
  countryCandidates: Array<string | null | undefined>
): Promise<BirdrJourney | null> {
  if (!canQueryBirdrJourney()) return null;
  const tried = new Set<string>();
  for (const raw of countryCandidates) {
    const code = raw?.trim()?.toUpperCase();
    if (!code || tried.has(code)) continue;
    tried.add(code);
    try {
      const journey = await getBirdrJourney(code);
      if (journey && isBirdrJourneyInProgress(journey)) return journey;
    } catch {
      /* skip candidate */
    }
  }
  return null;
}

/** Menu / nav target: ongoing journey progress or intro to start one. */
export async function getCountryChallengePath(
  countryCandidates: Array<string | null | undefined>
): Promise<string> {
  const journey = await findInProgressBirdrJourney(countryCandidates);
  const code = journey?.country?.code?.trim()?.toUpperCase();
  return code ? `/journey/${code}` : '/journey/intro';
}

export async function resolveBirdrJourneyPlayerToken(): Promise<string | null> {
  const stored = getStoredBirdrJourneyPlayerToken();
  if (stored) return stored;
  const mpgToken = localStorage.getItem('player-token')?.trim();
  if (mpgToken) {
    setStoredBirdrJourneyPlayerToken(mpgToken);
    return mpgToken;
  }
  return null;
}

async function journeyAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const jwt = authService.getAccessToken();
  if (jwt) {
    headers.Authorization = `Bearer ${jwt}`;
    return headers;
  }
  const playerToken = getStoredBirdrJourneyPlayerToken() || localStorage.getItem('player-token');
  if (playerToken) {
    headers.Authorization = `Bearer ${playerToken}`;
  }
  return headers;
}

export async function createBirdrJourneyPlayer(
  name: string,
  language: string
): Promise<{ token: string; name: string }> {
  const response = await fetch(apiUrl('/api/player/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ name, language }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseError(data, 'Failed to create player'));
  }
  setStoredBirdrJourneyPlayerToken(data.token);
  return data;
}

export async function getBirdrJourney(countryCode: string): Promise<BirdrJourney | null> {
  const url = apiUrl(`/api/birdr-journey/?country_code=${encodeURIComponent(countryCode)}`);
  const response = await fetch(url, {
    method: 'GET',
    headers: await journeyAuthHeaders(),
  });
  if (response.status === 404) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseError(data, 'Failed to load journey'));
  }
  const journey = data as BirdrJourney;
  await syncBirdrJourneyPlayerToken(journey);
  return journey;
}

export async function startBirdrJourney(countryCode: string): Promise<BirdrJourney> {
  const response = await fetch(apiUrl('/api/birdr-journey/'), {
    method: 'POST',
    headers: await journeyAuthHeaders(),
    body: JSON.stringify({ country_code: countryCode }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseError(data, 'Failed to start journey'));
  }
  const journey = data as BirdrJourney;
  await syncBirdrJourneyPlayerToken(journey);
  return journey;
}

export async function startJourneyStep(journeyId: number): Promise<StartStepResponse> {
  const response = await fetch(apiUrl(`/api/birdr-journey/${journeyId}/start-step/`), {
    method: 'POST',
    headers: await journeyAuthHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseError(data, 'Failed to start step'));
  }
  const result = data as StartStepResponse;
  await syncBirdrJourneyPlayerToken(result.journey);
  return result;
}

export async function completeJourneyStep(
  journeyId: number,
  gameToken?: string
): Promise<CompleteStepResponse> {
  const response = await fetch(apiUrl(`/api/birdr-journey/${journeyId}/complete-step/`), {
    method: 'POST',
    headers: await journeyAuthHeaders(),
    body: JSON.stringify(gameToken ? { game_token: gameToken } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseError(data, 'Failed to complete step'));
  }
  const result = data as CompleteStepResponse;
  await syncBirdrJourneyPlayerToken(result.journey);
  return result;
}

export async function advanceJourneyLevel(journeyId: number): Promise<BirdrJourney> {
  const response = await fetch(apiUrl(`/api/birdr-journey/${journeyId}/advance-level/`), {
    method: 'POST',
    headers: await journeyAuthHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseError(data, 'Failed to advance level'));
  }
  const journey = data as BirdrJourney;
  await syncBirdrJourneyPlayerToken(journey);
  return journey;
}

function playerAuthHeaders(playerToken: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${playerToken}`,
  };
}

export async function getChallengeQuestion(
  gameToken: string,
  playerToken?: string | null,
  options?: { cacheBust?: boolean }
): Promise<Question | null> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (playerToken) Object.assign(headers, playerAuthHeaders(playerToken));
  const url =
    apiUrl(`/api/games/${gameToken}/question`) + (options?.cacheBust ? `?${Date.now()}` : '');
  const response = await fetch(url, { method: 'GET', headers, cache: 'no-store' });
  if (response.status === 204 || response.status === 404) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return null;
  return data as Question;
}

export async function submitChallengeAnswer(
  payload: { question_id: number; answer_id: number; player_token: string },
  playerToken: string
): Promise<Answer> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  await authService.ensureValidAccessToken();
  const jwt = authService.getAccessToken();
  if (jwt) {
    headers.Authorization = `Bearer ${jwt}`;
  } else {
    Object.assign(headers, playerAuthHeaders(playerToken));
  }
  const response = await fetch(apiUrl('/api/answer/'), {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseError(data as Record<string, unknown>, 'Failed to submit answer'));
  }
  return data as Answer;
}

export function levelTitle(level: JourneyLevel | null | undefined, locale: string): string {
  if (!level) return '';
  if (locale === 'nl' && level.title_nl?.trim()) return level.title_nl;
  return level.title;
}

export function levelDescription(level: JourneyLevel | null | undefined, locale: string): string {
  if (!level) return '';
  if (locale === 'nl' && level.description_nl?.trim()) return level.description_nl;
  return level.description;
}

export function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return '';
  const base = 0x1f1e6;
  const c1 = code.charCodeAt(0) - 65;
  const c2 = code.charCodeAt(1) - 65;
  if (c1 < 0 || c1 > 25 || c2 < 0 || c2 > 25) return code;
  return String.fromCodePoint(base + c1, base + c2);
}
