import { apiUrl } from './config';
import { getAuthHeaders } from './auth';

export type CountryRef = { code: string; name: string; count?: number };

export type ChallengeLevel = {
  sequence: number;
  level: string;
  title: string;
  title_nl?: string;
  description: string;
  description_nl?: string;
  length: number;
  media: string;
  jokers: number;
};

export type GameRef = {
  token: string;
  level: string;
  length: number;
  media: string;
  country: CountryRef;
  language: string;
  progress?: number;
  ended?: boolean;
  scores?: Array<{ answers?: Array<{ sequence?: number; correct?: boolean }> }>;
};

export type CountryGameLevel = {
  id: number;
  game: GameRef;
  challenge_level: ChallengeLevel;
  created: string;
  status: 'new' | 'running' | 'passed' | 'failed';
  remaining_jokers: number;
};

export type PlayerRef = {
  id: number;
  token: string;
  name: string;
  language: string;
};

export type CountryChallenge = {
  id: number;
  country: CountryRef;
  player: PlayerRef;
  created: string;
  levels: CountryGameLevel[];
};

export type QuestionOption = {
  id: number;
  code: string;
  name: string;
  name_latin: string;
  name_nl?: string;
  name_translated?: string;
  images?: Array<{ url: string }>;
  sounds?: Array<{ url: string }>;
  videos?: Array<{ url: string }>;
};

export type ChallengeQuestion = {
  id: number;
  number: number;
  sequence: number;
  game: { token: string };
  options?: QuestionOption[];
  images: Array<{ url: string; link?: string; contributor?: string }>;
  sounds: Array<{ url: string; link?: string; contributor?: string }>;
  videos: Array<{ url: string; link?: string; contributor?: string }>;
};

export type AnswerPayload = {
  question_id: number;
  answer_id: number;
  player_token: string;
};

/** Response from submitChallengeAnswer; backend AnswerSerializer returns answer, species, correct. */
export type SubmitChallengeAnswerResponse = {
  correct?: boolean;
  score?: number;
  /** User's chosen species (from answer_id). */
  answer?: QuestionOption;
  /** Correct species for the question. */
  species?: QuestionOption;
  [k: string]: unknown;
};

const CHALLENGE_PLAYER_KEY = 'challenge_player_token';

/** Get stored challenge player token (for country challenge flow). */
export async function getStoredChallengePlayerToken(): Promise<string | null> {
  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
  return AsyncStorage.getItem(CHALLENGE_PLAYER_KEY);
}

/** Store challenge player token after creating/starting a challenge. */
export async function setStoredChallengePlayerToken(token: string): Promise<void> {
  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
  await AsyncStorage.setItem(CHALLENGE_PLAYER_KEY, token);
}

/** Clear stored challenge player token. */
export async function clearStoredChallengePlayerToken(): Promise<void> {
  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
  await AsyncStorage.removeItem(CHALLENGE_PLAYER_KEY);
}

function playerAuthHeaders(playerToken: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${playerToken}`,
  };
}

/** Create a player for the challenge (links to user if JWT sent). Returns player with token. */
export async function createChallengePlayer(
  name: string,
  language: string
): Promise<PlayerRef & { token: string }> {
  const headers = (await getAuthHeaders()) as Record<string, string>;
  const response = await fetch(apiUrl('/api/player/'), {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name.trim(), language }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data.detail ?? data.error ?? data.message ?? 'Failed to create player';
    throw new Error(typeof msg === 'string' ? msg : 'Failed to create player');
  }
  return data as PlayerRef & { token: string };
}

/** Load current country challenge for the given player token.
 * Returns the challenge in progress or null (404). This response is the single source of truth for
 * in-progress state, level, and progress: use challenge.levels[].game.scores[0].answers for
 * correct/incorrect per question and to derive current question index (e.g. answers.length + 1).
 * Pass cacheBust: true to avoid stale responses after answering or loading next question. */
export async function loadCountryChallenge(
  playerToken: string,
  options?: { cacheBust?: boolean }
): Promise<CountryChallenge | null> {
  const url =
    apiUrl('/api/country-challenges/current/') +
    (options?.cacheBust ? `?${Date.now()}` : '');
  const response = await fetch(url, {
    method: 'GET',
    headers: playerAuthHeaders(playerToken),
  });
  if (response.status === 404) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data.detail ?? data.error ?? data.message ?? 'Failed to load challenge';
    throw new Error(typeof msg === 'string' ? msg : 'Failed to load challenge');
  }
  return data as CountryChallenge;
}

/** Start a new country challenge. */
export async function startCountryChallenge(
  countryCode: string,
  playerToken: string
): Promise<CountryChallenge> {
  const response = await fetch(apiUrl('/api/country-challenges/'), {
    method: 'POST',
    headers: playerAuthHeaders(playerToken),
    body: JSON.stringify({ country_code: countryCode }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data.detail ?? data.error ?? data.message ?? 'Failed to start challenge';
    throw new Error(typeof msg === 'string' ? msg : 'Failed to start challenge');
  }
  return data as CountryChallenge;
}

/** Get next challenge level (new game or retry). Refreshes challenge state on server. */
export async function getNextChallengeLevel(
  challengeId: number,
  playerToken: string
): Promise<CountryGameLevel> {
  const response = await fetch(apiUrl(`/api/challenge/${challengeId}/next-level`), {
    method: 'POST',
    headers: playerAuthHeaders(playerToken),
  });
  const data = await response.json().catch((e) => {
  });

  if (!response.ok) {
    alert(response.ok)
    alert("Oepsie")
    const msg = data.detail ?? data.error ?? data.message ?? 'Failed to get next level';
    throw new Error(typeof msg === 'string' ? msg : 'Failed to get next level');
  }
  return data as CountryGameLevel;
}

/** Get the current question for the challenge game. Optionally pass playerToken for auth.
 * Uses cache-busting query param (like the web app) to avoid stale responses.
 * Times out after timeoutMs (default 25s) to avoid hanging. */
export async function getChallengeQuestion(
  gameToken: string,
  playerToken?: string | null,
  options?: { cacheBust?: boolean; timeoutMs?: number }
): Promise<ChallengeQuestion | null> {
  const headers: HeadersInit = { Accept: 'application/json' };
  if (playerToken) {
    Object.assign(headers, playerAuthHeaders(playerToken));
  }
  const url =
    apiUrl(`/api/games/${gameToken}/question`) +
    (options?.cacheBust ? `?${Date.now()}` : '');
  const timeoutMs = options?.timeoutMs ?? 25_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    if (response.status === 404 || response.status === 204) return null;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg = data.detail ?? data.error ?? data.message ?? 'Failed to load question';
      throw new Error(typeof msg === 'string' ? msg : 'Failed to load question');
    }
    const question = data as ChallengeQuestion;
    if (question?.game?.token !== gameToken) {
      return null;
    }
    return question;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Submit an answer for the challenge. */
export async function submitChallengeAnswer(
  payload: AnswerPayload,
  playerToken: string
): Promise<SubmitChallengeAnswerResponse> {
  const response = await fetch(apiUrl('/api/answer/'), {
    method: 'POST',
    headers: playerAuthHeaders(playerToken),
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data.detail ?? data.error ?? data.message ?? 'Failed to submit answer';
    throw new Error(typeof msg === 'string' ? msg : 'Failed to submit answer');
  }
  return data as SubmitChallengeAnswerResponse;
}
