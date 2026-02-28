import { apiUrl } from './config';
import type { Species } from '../types/game';

/**
 * Fetch species for a country (for expert autocomplete).
 * Uses same endpoint as React app: GET /api/species/?countryspecies__country=XX&language=YY
 */
export async function getSpeciesForCountry(
  countryCode: string,
  language: string
): Promise<Species[]> {
  const url = `${apiUrl('/api/species/')}?countryspecies__country=${encodeURIComponent(countryCode)}&language=${encodeURIComponent(language)}`;
  const response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
  if (!response.ok) return [];
  const data = await response.json().catch(() => []);
  return Array.isArray(data) ? data : data?.results ?? data?.data ?? [];
}
