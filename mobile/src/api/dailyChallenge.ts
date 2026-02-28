import { apiUrl } from './config';
import { getAuthHeaders } from './auth';

export type DailyChallengeRound = {
  id: number;
  day_number: number;
  game: number | null;
  game_token: string | null;
  my_player_token?: string | null;
  opens_at: string;
  closes_at: string;
  status: string;
  created: string;
};

export type DailyChallengeParticipant = {
  id: number;
  user: { id: number; username: string; profile?: Record<string, unknown> };
  status: string;
  accepted_at: string | null;
  created: string;
};

export type DailyChallenge = {
  id: number;
  token: string;
  creator: number;
  creator_username: string;
  country: { code: string; name: string };
  media: string;
  length: number;
  duration_days: number;
  started_at: string | null;
  status: string;
  participants: DailyChallengeParticipant[];
  rounds: DailyChallengeRound[];
  created: string;
};

/** Resolve invite by token (GET). Returns challenge_id and accept_url. */
export async function getChallengeAcceptInfo(inviteToken: string): Promise<{
  type: string;
  challenge_id: number;
  invite_token?: string;
  accept_url: string;
}> {
  const response = await fetch(apiUrl(`/api/daily-challenges/accept/${inviteToken}/`));
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Invalid or expired invite');
  }
  return data;
}

/** Accept invite by token (POST). Requires auth. */
export async function acceptChallengeByToken(inviteToken: string): Promise<DailyChallenge> {
  const headers = await getAuthHeaders();
  const response = await fetch(apiUrl('/api/daily-challenges/accept-by-token/'), {
    method: 'POST',
    headers: { ...(headers as Record<string, string>), 'Content-Type': 'application/json' },
    body: JSON.stringify({ invite_token: inviteToken }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to accept invite');
  }
  return data as DailyChallenge;
}

/** List my daily challenges. */
export async function listDailyChallenges(): Promise<DailyChallenge[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(apiUrl('/api/daily-challenges/'), {
    method: 'GET',
    headers: headers as Record<string, string>,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to load challenges');
  }
  return Array.isArray(data) ? data : [];
}

/** Get challenge detail. */
export async function getDailyChallenge(id: number): Promise<DailyChallenge> {
  const headers = await getAuthHeaders();
  const response = await fetch(apiUrl(`/api/daily-challenges/${id}/`), {
    method: 'GET',
    headers: headers as Record<string, string>,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to load challenge');
  }
  return data as DailyChallenge;
}

/** Create daily challenge. */
export async function createDailyChallenge(params: {
  country: string;
  media?: string;
  length?: number;
  duration_days?: number;
}): Promise<DailyChallenge> {
  const headers = await getAuthHeaders();
  const response = await fetch(apiUrl('/api/daily-challenges/'), {
    method: 'POST',
    headers: { ...(headers as Record<string, string>), 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to create challenge');
  }
  return data as DailyChallenge;
}

/** Invite friends/emails to challenge. */
export async function inviteDailyChallenge(
  challengeId: number,
  params: { friend_user_ids?: number[]; emails?: string[] }
): Promise<DailyChallenge> {
  const headers = await getAuthHeaders();
  const response = await fetch(apiUrl(`/api/daily-challenges/${challengeId}/invite/`), {
    method: 'POST',
    headers: { ...(headers as Record<string, string>), 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to send invites');
  }
  return data as DailyChallenge;
}

/** Start the challenge (creator only). */
export async function startDailyChallenge(challengeId: number): Promise<DailyChallenge> {
  const headers = await getAuthHeaders();
  const response = await fetch(apiUrl(`/api/daily-challenges/${challengeId}/start/`), {
    method: 'POST',
    headers: headers as Record<string, string>,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to start challenge');
  }
  return data as DailyChallenge;
}

/** Get round info (including game_token and my_player_token for playing). */
export async function getDailyChallengeRound(
  challengeId: number,
  day: number
): Promise<DailyChallengeRound & { game_token?: string | null; my_player_token?: string | null }> {
  const headers = await getAuthHeaders();
  const response = await fetch(apiUrl(`/api/daily-challenges/${challengeId}/rounds/${day}/`), {
    method: 'GET',
    headers: headers as Record<string, string>,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to load round');
  }
  return data;
}
