import axios from './axios-config';
import type { Game } from '../core/app-context';

export type TroubleSpotSpecies = {
  species_id: number;
  name: string;
  name_latin: string;
  times_shown: number;
  correctly_answered: number;
  wrongly_answered: number;
  correct_rate: number | null;
  error_rate: number | null;
  illustration_url?: string | null;
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
  const params: Record<string, string> = {};
  if (countryCode?.trim()) params.country_code = countryCode.trim().toUpperCase();
  const { data } = await axios.get<TroubleSpotsResponse>('/api/practice/trouble-spots/', { params });
  return data;
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
  const body: Record<string, unknown> = { low_id: lowId, high_id: highId };
  if (countryCode?.trim()) body.country_code = countryCode.trim().toUpperCase();
  const { data } = await axios.post<StartPairPracticeResponse>(
    '/api/practice/confusion-pair/start/',
    body,
  );
  return data;
}

export async function startSpeciesPractice(
  speciesId: number,
  countryCode?: string,
): Promise<StartPairPracticeResponse> {
  const body: Record<string, unknown> = { species_id: speciesId };
  if (countryCode?.trim()) body.country_code = countryCode.trim().toUpperCase();
  const { data } = await axios.post<StartPairPracticeResponse>(
    '/api/practice/species/start/',
    body,
  );
  return data;
}
