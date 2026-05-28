import { apiUrl } from './config';

export type SpeciesCover = {
  id: number;
  illustration_url: string | null;
  illustration_status: string;
};

/** Cover image (illustration or photo fallback); may trigger AI generation. */
export async function fetchSpeciesCover(speciesId: number): Promise<SpeciesCover> {
  const response = await fetch(apiUrl(`/api/species/${speciesId}/cover/`), {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error('Failed to load species cover');
  }
  return response.json() as Promise<SpeciesCover>;
}
