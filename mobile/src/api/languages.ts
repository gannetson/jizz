import { apiUrl } from './config';
import { withScientificLanguage } from '../i18n/languageNames';

export type Language = { code: string; name: string };

export async function loadLanguages(): Promise<Language[]> {
  const response = await fetch(apiUrl('/api/languages/'), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return withScientificLanguage([]);
  const data = await response.json();
  return withScientificLanguage(Array.isArray(data) ? data : []);
}
