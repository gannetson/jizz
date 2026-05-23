import { apiUrl } from './config';
import { getAuthHeaders } from './auth';
import { createChallengePlayer, type PlayerRef } from './challenge';

export type CountryRef = { code: string; name: string };

export type JourneyLevel = {
  sequence: number;
  level?: string;
  title: string;
  description: string;
  title_nl?: string;
  description_nl?: string;
  length?: number;
  media?: string;
  jokers?: number;
};

export type RoadmapNode = {
  sequence: number;
  status: 'completed' | 'current' | 'locked';
};

export type BirdrJourney = {
  id: number;
  country: CountryRef;
  current_sequence: number;
  streak_days: number;
  last_played_date: string | null;
  can_play_today: boolean;
  current_level: JourneyLevel | null;
  next_level: JourneyLevel | null;
  roadmap: RoadmapNode[];
  created: string;
  updated: string;
};

const BIRDR_JOURNEY_PLAYER_KEY = 'birdr_journey_player_token';

export async function getStoredBirdrJourneyPlayerToken(): Promise<string | null> {
  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
  return AsyncStorage.getItem(BIRDR_JOURNEY_PLAYER_KEY);
}

export async function setStoredBirdrJourneyPlayerToken(token: string): Promise<void> {
  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
  await AsyncStorage.setItem(BIRDR_JOURNEY_PLAYER_KEY, token);
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
  return data as BirdrJourney;
}

/** Get or create journey at sequence 0 for country. */
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
  return data as BirdrJourney;
}
