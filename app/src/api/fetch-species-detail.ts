import { getApiBaseUrl } from './baseUrl';
import type { Species } from '../core/app-context';

/** Load full species media (approved / eligible) for modals. */
export async function fetchSpeciesDetail(
  speciesId: number,
  language?: string
): Promise<Species> {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const params = language ? `?language=${encodeURIComponent(language)}` : '';
  const response = await fetch(`${base}/api/species/${speciesId}/${params}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error('Failed to load species');
  }
  return response.json() as Promise<Species>;
}
