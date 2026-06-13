import { apiUrl } from './config';
import { getAuthHeaders } from './auth';

export type User = {
  username: string;
  first_name: string;
  last_name: string;
};

export type UpdateListItem = {
  id: number;
  created: string;
  title: string;
  excerpt: string;
  user: User;
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

type UpdatesResponse = {
  results: UpdateListItem[];
};

export async function loadUpdates(playerToken?: string): Promise<UpdateListItem[]> {
  const query = playerToken ? `?player_token=${encodeURIComponent(playerToken)}` : '';
  const headers = await getAuthHeaders();
  const response = await fetch(apiUrl(`/api/updates/${query}`), {
    method: 'GET',
    headers: { ...(headers as Record<string, string>), Accept: 'application/json' },
  });
  if (!response.ok) return [];
  const data: UpdatesResponse = await response.json();
  return data.results ?? [];
}

export async function loadUpdateDetail(id: number, playerToken?: string): Promise<UpdateDetail | null> {
  const query = playerToken ? `?player_token=${encodeURIComponent(playerToken)}` : '';
  const headers = await getAuthHeaders();
  const response = await fetch(apiUrl(`/api/updates/${id}/${query}`), {
    method: 'GET',
    headers: { ...(headers as Record<string, string>), Accept: 'application/json' },
  });
  if (!response.ok) return null;
  return response.json();
}

export async function toggleUpdateThumbsUp(
  id: number,
  active: boolean,
  playerToken?: string,
): Promise<{ thumbs_up_count: number; user_has_thumbs_up: boolean } | null> {
  const headers = await getAuthHeaders();
  const response = await fetch(apiUrl(`/api/updates/${id}/thumbs-up/`), {
    method: active ? 'POST' : 'DELETE',
    headers: {
      ...(headers as Record<string, string>),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(playerToken ? { player_token: playerToken } : {}),
  });
  if (!response.ok) return null;
  return response.json();
}
