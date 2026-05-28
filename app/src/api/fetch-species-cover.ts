import { getApiBaseUrl } from './baseUrl';

export type SpeciesCover = {
  id: number;
  illustration_url: string | null;
  illustration_status: string;
};

/** Cover image (illustration or photo fallback); may trigger AI generation. */
export async function fetchSpeciesCover(speciesId: number): Promise<SpeciesCover> {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const response = await fetch(`${base}/api/species/${speciesId}/cover/`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error('Failed to load species cover');
  }
  return response.json() as Promise<SpeciesCover>;
}
