import { apiUrl } from './config';

export type AppVersionResponse = {
  min_version: string;
  app_store_url: string;
  play_store_url: string;
};

export async function fetchAppVersionRequirements(): Promise<AppVersionResponse | null> {
  try {
    const response = await fetch(apiUrl('/api/app-version/'), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    return (await response.json()) as AppVersionResponse;
  } catch {
    return null;
  }
}
