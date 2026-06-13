import { apiUrl } from './config';
import { settingsFromPlayLevel, type PlayLevel } from '../game/playLevel';
import { ensureFreshAccessToken } from './auth';
import { PLAYER_TOKEN_STORAGE_KEY } from './player';

export type Score = {
  name: string;
  ranking: number;
  score: number;
  created: string;
  level: string;
  country: { code: string; name: string };
  media: string;
  length: number;
  rarity?: string;
  is_mine?: boolean;
};

async function scoresAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const jwt = await ensureFreshAccessToken();
  if (jwt) {
    headers.Authorization = `Bearer ${jwt}`;
    return headers;
  }
  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
  const playerToken =
    (await AsyncStorage.getItem(PLAYER_TOKEN_STORAGE_KEY)) ??
    (await AsyncStorage.getItem('challenge_player_token'));
  if (playerToken?.trim()) {
    headers.Authorization = `Bearer ${playerToken.trim()}`;
  }
  return headers;
}

type ScoresResponse = { results: Score[] };

export async function loadScores(params: {
  playLevel?: PlayLevel | '';
  length?: string;
  media?: string;
  country?: string;
  /** Set to true to bypass HTTP cache (e.g. after user taps refresh). */
  cacheBust?: boolean;
}): Promise<Score[]> {
  const q = new URLSearchParams();
  if (params.playLevel) {
    const preset = settingsFromPlayLevel(params.playLevel);
    q.set('game__level', preset.level);
    q.set('game__rarity', preset.rarity);
  }
  if (params.length) q.set('game__length', params.length);
  if (params.media) q.set('game__media', params.media);
  if (params.country) q.set('game__country', params.country);
  if (params.cacheBust) q.set('_', String(Date.now()));
  const url = apiUrl(`/api/scores/?${q.toString()}`);
  const response = await fetch(url, {
    method: 'GET',
    headers: await scoresAuthHeaders(),
    cache: 'no-store',
  });
  if (!response.ok) return [];
  const data: ScoresResponse = await response.json();
  return data.results ?? [];
}
