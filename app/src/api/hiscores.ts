import { apiUrl } from './baseUrl';
import { authService } from './services/auth.service';

export async function hiscoresAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  await authService.ensureValidAccessToken();
  const jwt = authService.getAccessToken();
  if (jwt) {
    headers.Authorization = `Bearer ${jwt}`;
    return headers;
  }
  const playerToken = localStorage.getItem('player-token')?.trim();
  if (playerToken) {
    headers.Authorization = `Bearer ${playerToken}`;
  }
  return headers;
}

export async function fetchHiscores(url: string): Promise<Response> {
  return fetch(apiUrl(url), {
    cache: 'no-cache',
    method: 'GET',
    headers: await hiscoresAuthHeaders(),
  });
}
