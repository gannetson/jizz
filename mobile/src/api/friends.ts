import { apiUrl } from './config';
import { getAuthHeaders } from './auth';

export type FriendUser = {
  id: number;
  username: string;
  profile?: { username?: string; language?: string; country_code?: string };
};

export async function getFriends(): Promise<FriendUser[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(apiUrl('/api/friends/'), {
    method: 'GET',
    headers: headers as Record<string, string>,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to load friends');
  }
  return Array.isArray(data) ? data : [];
}

export async function getFriendRequests(): Promise<{ received: unknown[]; sent: unknown[] }> {
  const headers = await getAuthHeaders();
  const response = await fetch(apiUrl('/api/friends/requests/'), {
    method: 'GET',
    headers: headers as Record<string, string>,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to load requests');
  }
  return data;
}

export async function sendFriendRequest(params: { user_id?: number; username?: string }): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(apiUrl('/api/friends/request/'), {
    method: 'POST',
    headers: { ...(headers as Record<string, string>), 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to send request');
  }
}

export async function acceptFriendRequest(friendshipId: number): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(apiUrl(`/api/friends/accept/${friendshipId}/`), {
    method: 'POST',
    headers: headers as Record<string, string>,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to accept');
  }
}

export async function declineFriendRequest(friendshipId: number): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(apiUrl(`/api/friends/decline/${friendshipId}/`), {
    method: 'POST',
    headers: headers as Record<string, string>,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to decline');
  }
}
