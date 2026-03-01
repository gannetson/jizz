import axios from '../axios-config';
import { getApiBaseUrl } from '../baseUrl';

export type DailyChallengeRound = {
  id: number;
  day_number: number;
  game: number | null;
  game_token: string | null;
  my_player_token?: string | null;
  game_ended?: boolean;
  user_score?: number | null;
  points_multiplier?: number;
  display_score?: number | null;
  opens_at: string;
  closes_at: string;
  opens_at_local?: string | null;
  closes_at_local?: string | null;
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
  level?: string;
  started_at: string | null;
  status: string;
  participants: DailyChallengeParticipant[];
  rounds: DailyChallengeRound[];
  created: string;
};

export type CreateDailyChallengeParams = {
  country: string;
  media?: string;
  length?: number;
  duration_days?: number;
  level?: string;
};

/** Resolve invite by token (GET). No auth required. */
export async function getChallengeAcceptInfo(inviteToken: string): Promise<{
  type: string;
  challenge_id: number;
  invite_token?: string;
  accept_url: string;
}> {
  const baseURL = getApiBaseUrl();
  const response = await axios.get(`${baseURL}/api/daily-challenges/accept/${inviteToken}/`);
  return response.data;
}

/** Accept invite by token (POST). Requires auth. */
export async function acceptChallengeByToken(inviteToken: string): Promise<DailyChallenge> {
  const baseURL = getApiBaseUrl();
  const response = await axios.post(`${baseURL}/api/daily-challenges/accept-by-token/`, {
    invite_token: inviteToken,
  });
  return response.data;
}

/** List my daily challenges. */
export async function listDailyChallenges(): Promise<DailyChallenge[]> {
  const baseURL = getApiBaseUrl();
  const response = await axios.get<DailyChallenge[]>(`${baseURL}/api/daily-challenges/`);
  return Array.isArray(response.data) ? response.data : [];
}

/** Get challenge detail. */
export async function getDailyChallenge(id: number): Promise<DailyChallenge> {
  const baseURL = getApiBaseUrl();
  const response = await axios.get<DailyChallenge>(`${baseURL}/api/daily-challenges/${id}/`);
  return response.data;
}

/** Create daily challenge. */
export async function createDailyChallenge(params: CreateDailyChallengeParams): Promise<DailyChallenge> {
  const baseURL = getApiBaseUrl();
  const response = await axios.post<DailyChallenge>(`${baseURL}/api/daily-challenges/`, {
    ...params,
    level: params.level ?? 'advanced',
  });
  return response.data;
}

/** Invite by email (and optionally friend_user_ids). */
export async function inviteDailyChallenge(
  challengeId: number,
  params: { friend_user_ids?: number[]; emails?: string[] }
): Promise<DailyChallenge> {
  const baseURL = getApiBaseUrl();
  const response = await axios.post<DailyChallenge>(
    `${baseURL}/api/daily-challenges/${challengeId}/invite/`,
    params
  );
  return response.data;
}

/** Start the challenge (creator only). */
export async function startDailyChallenge(challengeId: number): Promise<DailyChallenge> {
  const baseURL = getApiBaseUrl();
  const response = await axios.post<DailyChallenge>(
    `${baseURL}/api/daily-challenges/${challengeId}/start/`
  );
  return response.data;
}

/** Get round info (game_token, my_player_token for playing). */
export async function getDailyChallengeRound(
  challengeId: number,
  day: number
): Promise<DailyChallengeRound & { game_token?: string | null; my_player_token?: string | null }> {
  const baseURL = getApiBaseUrl();
  const response = await axios.get(
    `${baseURL}/api/daily-challenges/${challengeId}/rounds/${day}/`
  );
  return response.data;
}
