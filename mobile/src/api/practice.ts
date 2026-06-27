import { apiUrl } from './config';
import { getAuthHeaders } from './auth';
import { readApiErrorMessage } from './apiError';
import type { Game } from './games';

export type TroubleSpotSpecies = {
  species_id: number;
  name: string;
  name_latin: string;
  times_shown: number;
  wrongly_answered: number;
  error_rate: number | null;
};

export type TroubleSpotPair = {
  low_id: number;
  high_id: number;
  total_wrong: number;
  when_low_was_target: number;
  when_high_was_target: number;
  low_name: string;
  high_name: string;
  low_name_latin: string;
  high_name_latin: string;
};

export type TroubleSpotsResponse = {
  country_code: string | null;
  species: TroubleSpotSpecies[];
  pairs: TroubleSpotPair[];
};

export async function fetchTroubleSpots(countryCode?: string): Promise<TroubleSpotsResponse> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams();
  if (countryCode?.trim()) params.set('country_code', countryCode.trim().toUpperCase());
  const qs = params.toString();
  const response = await fetch(
    `${apiUrl('/api/practice/trouble-spots/')}${qs ? `?${qs}` : ''}`,
    { headers: { Accept: 'application/json', ...headers } },
  );
  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response));
  }
  return (await response.json()) as TroubleSpotsResponse;
}

export type StartPairPracticeResponse = {
  game: Game;
  player_token: string;
};

export async function startConfusionPairPractice(
  lowId: number,
  highId: number,
  countryCode?: string,
): Promise<StartPairPracticeResponse> {
  const headers = await getAuthHeaders();
  const body: Record<string, unknown> = { low_id: lowId, high_id: highId };
  if (countryCode?.trim()) body.country_code = countryCode.trim().toUpperCase();
  const response = await fetch(apiUrl('/api/practice/confusion-pair/start/'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response));
  }
  return (await response.json()) as StartPairPracticeResponse;
}
