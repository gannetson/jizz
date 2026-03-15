import { apiUrl } from './config';

export type Score = {
  name: string;
  ranking: number;
  score: number;
  created: string;
  level: string;
  country: { code: string; name: string };
  media: string;
  length: number;
};

type ScoresResponse = { results: Score[] };

export async function loadScores(params: {
  level?: string;
  length?: string;
  media?: string;
  country?: string;
  /** Set to true to bypass HTTP cache (e.g. after user taps refresh). */
  cacheBust?: boolean;
}): Promise<Score[]> {
  const q = new URLSearchParams();
  if (params.level) q.set('game__level', params.level);
  if (params.length) q.set('game__length', params.length);
  if (params.media) q.set('game__media', params.media);
  if (params.country) q.set('game__country', params.country);
  if (params.cacheBust) q.set('_', String(Date.now()));
  const url = apiUrl(`/api/scores/?${q.toString()}`);
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    // Avoid cached response so new scores appear after playing
    cache: 'no-store',
  });
  if (!response.ok) return [];
  const data: ScoresResponse = await response.json();
  return data.results ?? [];
}
