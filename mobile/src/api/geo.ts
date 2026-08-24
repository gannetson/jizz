import { apiUrl } from './config';

export async function fetchGuessedCountryCode(): Promise<string | null> {
  try {
    const response = await fetch(apiUrl('/api/geo/country/'), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const data = await response.json();
    const code = typeof data?.country_code === 'string' ? data.country_code.trim().toUpperCase() : '';
    return code || null;
  } catch {
    return null;
  }
}
