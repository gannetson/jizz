import { apiUrl } from '../api/baseUrl';
import { authService } from '../api/services/auth.service';

export type UpdateAuthor = {
  username: string;
  first_name: string;
  last_name: string;
};

export type UpdateListItem = {
  id: number;
  created: string;
  title: string;
  excerpt: string;
  user: UpdateAuthor;
  thumbs_up_count: number;
  user_has_thumbs_up: boolean;
};

export type UpdateDetail = UpdateListItem & {
  body: string;
  body_en: string;
  body_nl: string;
  title_en: string;
  title_nl: string;
};

type PaginatedUpdates = {
  results: UpdateListItem[];
};

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const token = authService.getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function loadUpdates(playerToken?: string): Promise<UpdateListItem[]> {
  const query = playerToken ? `?player_token=${encodeURIComponent(playerToken)}` : '';
  const response = await fetch(apiUrl(`/api/updates/${query}`), {
    cache: 'no-cache',
    method: 'GET',
    headers: await authHeaders(),
  });
  if (!response.ok) {
    return [];
  }
  const data: PaginatedUpdates = await response.json();
  return data.results ?? [];
}

export async function loadUpdateDetail(id: string | number, playerToken?: string): Promise<UpdateDetail | null> {
  const query = playerToken ? `?player_token=${encodeURIComponent(playerToken)}` : '';
  const response = await fetch(apiUrl(`/api/updates/${id}/${query}`), {
    cache: 'no-cache',
    method: 'GET',
    headers: await authHeaders(),
  });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

export async function toggleUpdateThumbsUp(
  id: string | number,
  active: boolean,
  playerToken?: string,
): Promise<{ thumbs_up_count: number; user_has_thumbs_up: boolean } | null> {
  const response = await fetch(apiUrl(`/api/updates/${id}/thumbs-up/`), {
    method: active ? 'POST' : 'DELETE',
    headers: await authHeaders(),
    body: JSON.stringify(playerToken ? { player_token: playerToken } : {}),
  });
  if (!response.ok) {
    return null;
  }
  return response.json();
}
