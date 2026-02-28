import { apiUrl } from './config';

export type User = {
  username: string;
  first_name: string;
  last_name: string;
};

export type Update = {
  id: string;
  created: string;
  message: string;
  title: string;
  user: User;
  reactions?: Reaction[];
};

export type Reaction = {
  created?: string;
  message: string;
  name?: string;
  update_id?: string;
  player_token?: string;
};

type UpdatesResponse = {
  results: Update[];
};

export async function loadUpdates(): Promise<Update[]> {
  const response = await fetch(apiUrl('/api/updates/'), {
    method: 'GET',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  });
  if (response.ok) {
    const data: UpdatesResponse = await response.json();
    return data.results ?? [];
  }
  return [];
}

export async function postReaction(
  updateId: string,
  playerToken: string,
  message: string
): Promise<Reaction | null> {
  const response = await fetch(apiUrl('/api/updates/reactions/'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      update_id: updateId,
      player_token: playerToken,
      message: message.trim(),
    }),
  });
  if (response.status === 201) {
    return response.json();
  }
  return null;
}
