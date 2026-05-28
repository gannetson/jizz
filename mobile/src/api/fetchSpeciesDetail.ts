import { apiUrl } from './config';
import type { SpeciesMediaData } from '../components/SpeciesMediaModal';

export type SpeciesDetail = SpeciesMediaData;

/** Full species payload for modals (images, videos, sounds). */
export async function fetchSpeciesDetail(
  speciesId: number,
  language?: string
): Promise<SpeciesDetail> {
  const params = language ? `?language=${encodeURIComponent(language)}` : '';
  const response = await fetch(apiUrl(`/api/species/${speciesId}/${params}`), {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error('Failed to load species');
  }
  return response.json() as Promise<SpeciesDetail>;
}
