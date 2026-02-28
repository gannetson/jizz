import { apiUrl } from './config';

export type Language = { code: string; name: string };

export async function loadLanguages(): Promise<Language[]> {
  const response = await fetch(apiUrl('/api/languages/'), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}
