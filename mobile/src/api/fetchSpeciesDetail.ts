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

export type SpeciesSlugInfo = {
  id: number;
  name: string;
  name_latin: string;
  name_nl?: string | null;
  name_translated?: string;
  slug: string;
};

export async function fetchSpeciesBySlug(
  slug: string,
  language?: string,
): Promise<SpeciesSlugInfo> {
  const params = language ? `?language=${encodeURIComponent(language)}` : '';
  const response = await fetch(
    apiUrl(`/api/species/by-slug/${encodeURIComponent(slug)}/${params}`),
    { headers: { Accept: 'application/json' } },
  );
  if (!response.ok) {
    throw new Error('Failed to load species');
  }
  return response.json() as Promise<SpeciesSlugInfo>;
}

export function parseComparePairSlug(pair: string): [string, string] | null {
  const sep = '-vs-';
  const index = pair.indexOf(sep);
  if (index <= 0) return null;
  const left = pair.slice(0, index);
  const right = pair.slice(index + sep.length);
  if (!left || !right) return null;
  return [left, right];
}
