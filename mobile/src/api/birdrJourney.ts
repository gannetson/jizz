import { apiUrl } from './config';
import { getAuthHeaders } from './auth';
import {
  createChallengePlayer,
  setStoredChallengePlayerToken,
  type PlayerRef,
} from './challenge';
import { PLAYER_TOKEN_STORAGE_KEY } from './player';

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
  status: JourneyStepStatus;
  resolved_family_name_latin?: string | null;
  resolved_family_name?: string | null;
  resolved_family_description?: string | null;
};

export function isFamilyJourneyStep(step: JourneyStep): boolean {
  return (
    step.step_type === 'family' ||
    step.step_type === 'familiy' ||
    !!step.resolved_family_name_latin
  );
}

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
  /** Host player token for submitting answers (guest or logged-in user). */
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

const BIRDR_JOURNEY_PLAYER_KEY = 'birdr_journey_player_token';
const BIRDR_JOURNEY_COUNTRY_KEY = 'birdr_journey_country_code';

export async function getStoredBirdrJourneyCountryCode(): Promise<string | null> {
  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
  return AsyncStorage.getItem(BIRDR_JOURNEY_COUNTRY_KEY);
}

export async function setStoredBirdrJourneyCountryCode(code: string): Promise<void> {
  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
  await AsyncStorage.setItem(BIRDR_JOURNEY_COUNTRY_KEY, code.trim().toUpperCase());
}

export async function clearStoredBirdrJourneyCountryCode(): Promise<void> {
  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
  await AsyncStorage.removeItem(BIRDR_JOURNEY_COUNTRY_KEY);
}

async function persistJourneyCountry(journey: BirdrJourney | null | undefined): Promise<void> {
  const code = journey?.country?.code?.trim();
  if (code) await setStoredBirdrJourneyCountryCode(code);
}

/** Drop stored active country when it no longer exists on the server. */
async function reconcileStoredBirdrJourneyCountry(journeys: BirdrJourney[]): Promise<void> {
  const stored = (await getStoredBirdrJourneyCountryCode())?.trim()?.toUpperCase();
  if (!stored) return;
  const codes = new Set(journeys.map((j) => j.country.code.trim().toUpperCase()));
  if (!codes.has(stored)) {
    await clearStoredBirdrJourneyCountryCode();
  }
}

async function clearStoredCountryIfMatches(countryCode: string): Promise<void> {
  const stored = (await getStoredBirdrJourneyCountryCode())?.trim()?.toUpperCase();
  if (stored && stored === countryCode.trim().toUpperCase()) {
    await clearStoredBirdrJourneyCountryCode();
  }
}

export async function getStoredBirdrJourneyPlayerToken(): Promise<string | null> {
  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
  return AsyncStorage.getItem(BIRDR_JOURNEY_PLAYER_KEY);
}

export async function setStoredBirdrJourneyPlayerToken(token: string): Promise<void> {
  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
  await AsyncStorage.setItem(BIRDR_JOURNEY_PLAYER_KEY, token);
  await AsyncStorage.setItem(PLAYER_TOKEN_STORAGE_KEY, token);
}

/** Persist host player token from a journey API response for answer submission. */
export async function syncBirdrJourneyPlayerToken(journey: BirdrJourney | null | undefined): Promise<string | null> {
  await persistJourneyCountry(journey);
  const token = journey?.player_token?.trim();
  if (!token) return getStoredBirdrJourneyPlayerToken();
  await setStoredBirdrJourneyPlayerToken(token);
  await setStoredChallengePlayerToken(token);
  return token;
}

/** True when the user has started a journey and has not reached the champion level. */
export function isBirdrJourneyInProgress(journey: BirdrJourney): boolean {
  return !journey.is_champion;
}

async function canQueryBirdrJourney(): Promise<boolean> {
  const headers = (await getAuthHeaders()) as Record<string, string>;
  if (headers.Authorization) return true;
  return !!(await getStoredBirdrJourneyPlayerToken());
}

/** Load the active in-progress journey (stored country, then most recently updated). */
export async function findInProgressBirdrJourney(
  countryCandidates: Array<string | null | undefined>
): Promise<BirdrJourney | null> {
  if (!(await canQueryBirdrJourney())) return null;
  const tried = new Set<string>();
  for (const raw of countryCandidates) {
    const code = raw?.trim()?.toUpperCase();
    if (!code || tried.has(code)) continue;
    tried.add(code);
    try {
      const journey = await getBirdrJourney(code);
      if (journey && isBirdrJourneyInProgress(journey)) return journey;
    } catch {
      // Auth or network error — skip this candidate.
    }
  }
  try {
    const journeys = await listBirdrJourneys();
    return journeys.find(isBirdrJourneyInProgress) ?? null;
  } catch {
    return null;
  }
}

/** List all country challenges for the current user or guest player. */
export async function listBirdrJourneys(): Promise<BirdrJourney[]> {
  return fetchBirdrJourneyList(false);
}

async function fetchBirdrJourneyList(retried: boolean): Promise<BirdrJourney[]> {
  const response = await journeyRequest(apiUrl('/api/birdr-journey/'), {
    method: 'GET',
  });
  const data = await response.json().catch(() => ({}));

  if (response.status === 401 && !retried) {
    await clearStoredBirdrJourneyPlayerToken();
    const headers = (await getAuthHeaders()) as Record<string, string>;
    if (headers.Authorization) {
      return fetchBirdrJourneyList(true);
    }
    await reconcileStoredBirdrJourneyCountry([]);
    return [];
  }

  if (!response.ok) {
    throw new Error(parseError(data, 'Failed to load journeys'));
  }
  if (!Array.isArray(data)) {
    throw new Error(parseError(data, 'Failed to load journeys'));
  }

  const journeys = data as BirdrJourney[];
  await reconcileStoredBirdrJourneyCountry(journeys);
  if (journeys.length > 0) {
    await syncBirdrJourneyPlayerToken(journeys[0]);
  }
  return journeys;
}

/** Remove a country challenge and its progress. */
export async function deleteBirdrJourney(journeyId: number): Promise<void> {
  const response = await journeyRequest(apiUrl(`/api/birdr-journey/${journeyId}/`), {
    method: 'DELETE',
  });
  if (response.status === 204) return;
  const data = await response.json().catch(() => ({}));
  throw new Error(parseError(data, 'Failed to remove challenge'));
}

export type CountryChallengeNavTarget =
  | { name: 'BirdrJourneyProgress'; params: { countryCode: string } }
  | { name: 'BirdrJourneyIntro' }
  | { name: 'BirdrJourneyList' };

/** Home hero: ongoing journey progress or intro to start one. */
export async function resolveCountryChallengeRoute(
  countryCandidates: Array<string | null | undefined>
): Promise<CountryChallengeNavTarget> {
  const journey = await findInProgressBirdrJourney(countryCandidates);
  const code = journey?.country?.code?.trim()?.toUpperCase();
  if (code) {
    return { name: 'BirdrJourneyProgress', params: { countryCode: code } };
  }
  return { name: 'BirdrJourneyIntro' };
}

const COUNTRY_CHALLENGE_ROUTE_NAMES = new Set([
  'BirdrJourneyList',
  'BirdrJourneyIntro',
  'BirdrJourneyCountry',
  'BirdrJourneyProgress',
  'BirdrJourneyStepIntro',
  'BirdrJourneyStepResults',
  'BirdrJourneyLevelCelebration',
  'ChallengePlay',
]);

export function isCountryChallengeRoute(routeName: string | undefined): boolean {
  return !!routeName && COUNTRY_CHALLENGE_ROUTE_NAMES.has(routeName);
}

/** Resolve stored journey player token, with fallbacks for logged-in users. */
export async function resolveBirdrJourneyPlayerToken(): Promise<string | null> {
  const stored = await getStoredBirdrJourneyPlayerToken();
  if (stored) return stored;
  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
  const mpgToken = (await AsyncStorage.getItem(PLAYER_TOKEN_STORAGE_KEY))?.trim();
  if (mpgToken) {
    await setStoredBirdrJourneyPlayerToken(mpgToken);
    return mpgToken;
  }
  return null;
}

export async function clearStoredBirdrJourneyPlayerToken(): Promise<void> {
  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
  await AsyncStorage.removeItem(BIRDR_JOURNEY_PLAYER_KEY);
}

async function journeyAuthHeaders(): Promise<HeadersInit> {
  const headers = (await getAuthHeaders()) as Record<string, string>;
  if (headers.Authorization) {
    return headers;
  }
  const playerToken = await getStoredBirdrJourneyPlayerToken();
  if (playerToken) {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${playerToken}`,
    };
  }
  return headers;
}

const JOURNEY_NO_CACHE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
};

function journeyCacheBustUrl(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_=${Date.now()}`;
}

/** Journey API fetch — bypass React Native / HTTP caches on GET. */
async function journeyRequest(url: string, init: RequestInit = {}): Promise<Response> {
  const authHeaders = (await journeyAuthHeaders()) as Record<string, string>;
  const method = (init.method ?? 'GET').toUpperCase();
  const fetchUrl = method === 'GET' ? journeyCacheBustUrl(url) : url;
  return fetch(fetchUrl, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...authHeaders,
      ...JOURNEY_NO_CACHE_HEADERS,
      ...(init.headers as Record<string, string> | undefined),
    },
    cache: 'no-store',
  });
}

function parseError(data: Record<string, unknown>, fallback: string): string {
  const msg = data.detail ?? data.error ?? data.message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return fallback;
}

/** Create guest player for journey (reuses player API). */
export async function createBirdrJourneyPlayer(
  name: string,
  language: string
): Promise<PlayerRef & { token: string }> {
  const player = await createChallengePlayer(name, language);
  await setStoredBirdrJourneyPlayerToken(player.token);
  return player;
}

/** Load journey for country; null if 404. */
export async function getBirdrJourney(
  countryCode: string,
  options?: { gameToken?: string }
): Promise<BirdrJourney | null> {
  const params = new URLSearchParams({ country_code: countryCode });
  const gameToken = options?.gameToken?.trim();
  if (gameToken) params.set('game_token', gameToken);
  const url = apiUrl(`/api/birdr-journey/?${params.toString()}`);
  const response = await journeyRequest(url, { method: 'GET' });
  if (response.status === 404) {
    await clearStoredCountryIfMatches(countryCode);
    return null;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseError(data, 'Failed to load journey'));
  }
  const journey = data as BirdrJourney;
  await syncBirdrJourneyPlayerToken(journey);
  return journey;
}

/** Get or create journey at sequence 0 for country. */
export async function startBirdrJourney(countryCode: string): Promise<BirdrJourney> {
  const response = await journeyRequest(apiUrl('/api/birdr-journey/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

/** Start or resume the active step game. */
export async function startJourneyStep(journeyId: number): Promise<StartStepResponse> {
  const response = await journeyRequest(apiUrl(`/api/birdr-journey/${journeyId}/start-step/`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseError(data, 'Failed to start step'));
  }
  const result = data as StartStepResponse;
  await syncBirdrJourneyPlayerToken(result.journey);
  return result;
}

/** Sync step progress after a game ends. */
export async function completeJourneyStep(
  journeyId: number,
  gameToken?: string
): Promise<CompleteStepResponse> {
  const response = await journeyRequest(apiUrl(`/api/birdr-journey/${journeyId}/complete-step/`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

/** Advance to the next level after celebration. */
export async function advanceJourneyLevel(journeyId: number): Promise<BirdrJourney> {
  const response = await journeyRequest(apiUrl(`/api/birdr-journey/${journeyId}/advance-level/`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseError(data, 'Failed to advance level'));
  }
  const journey = data as BirdrJourney;
  await syncBirdrJourneyPlayerToken(journey);
  return journey;
}
