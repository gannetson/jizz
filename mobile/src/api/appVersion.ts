import { apiUrl } from './config';

export type AppVersionResponse = {
  min_version: string;
  app_store_url: string;
  play_store_url: string;
  store_release_label_ios?: string | null;
  store_release_label_android?: string | null;
};

export async function fetchAppVersionRequirements(): Promise<AppVersionResponse | null> {
  try {
    const url = `${apiUrl('/api/app-version/')}?_=${Date.now()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return (await response.json()) as AppVersionResponse;
  } catch {
    return null;
  }
}
