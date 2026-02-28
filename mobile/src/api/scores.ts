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
}): Promise<Score[]> {
  const q = new URLSearchParams();
  if (params.level) q.set('game__level', params.level);
  if (params.length) q.set('game__length', params.length);
  if (params.media) q.set('game__media', params.media);
  if (params.country) q.set('game__country', params.country);
  const url = apiUrl(`/api/scores/?${q.toString()}`);
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return [];
  const data: ScoresResponse = await response.json();
  return data.results ?? [];
}
