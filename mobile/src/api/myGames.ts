import { apiUrl } from './config';
import { getAuthHeaders } from './auth';

export type CountryRef = { code: string; name: string };

export type UserGame = {
  token: string;
  country: CountryRef;
  level: string;
  language: string;
  created: string;
  multiplayer: boolean;
  length: number;
  progress?: number;
  media: string;
  repeat?: boolean;
  ended?: boolean;
  include_rare?: boolean;
  include_escapes?: boolean;
  user_score?: number;
  correct_count?: number;
  total_questions?: number;
};

export type PaginatedGamesResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: UserGame[];
};

/** Species ref with media arrays for game detail / species media */
export type SpeciesMediaRef = {
  id: number;
  name: string;
  name_latin: string;
  name_nl?: string;
  name_translated?: string;
  code: string;
  images?: Array<{ url: string; link?: string; contributor?: string }>;
  videos?: Array<{ url: string; link?: string; contributor?: string }>;
  sounds?: Array<{ url: string; link?: string; contributor?: string }>;
};

export type QuestionWithAnswer = {
  id: number;
  sequence: number;
  number: number;
  species: SpeciesMediaRef;
  user_answer: {
    id: number;
    name: string;
    name_latin: string;
    name_nl?: string;
    code: string;
    images?: Array<{ url: string; link?: string; contributor?: string }>;
    videos?: Array<{ url: string; link?: string; contributor?: string }>;
    sounds?: Array<{ url: string; link?: string; contributor?: string }>;
  } | null;
  time_taken_seconds: number | null;
  points: number | null;
  correct: boolean | null;
  created: string;
  media_item?: {
    type: 'image' | 'video' | 'audio';
    url: string;
    link?: string;
    contributor?: string;
    source?: string;
  } | null;
};

export type GameDetailWithAnswers = {
  token: string;
  country: { code: string; name: string; count?: number };
  level: string;
  language: string;
  created: string;
  multiplayer: boolean;
  length: number;
  progress: number;
  media: string;
  repeat: boolean;
  ended: boolean;
  tax_order?: string;
  tax_family?: string;
  include_rare: boolean;
  include_escapes: boolean;
  questions: QuestionWithAnswer[];
  total_score: number;
};

export async function getMyGames(page: number = 1): Promise<PaginatedGamesResponse> {
  const headers = await getAuthHeaders();
  const url = `${apiUrl('/api/my-games/')}?page=${page}`;
  const response = await fetch(url, { method: 'GET', headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }
    const msg = data.detail ?? data.error ?? data.message ?? 'Failed to load games';
    throw new Error(typeof msg === 'string' ? msg : 'Failed to load games');
  }
  return data as PaginatedGamesResponse;
}

/** Get game details with all questions and user's answers */
export async function getGameDetail(token: string): Promise<GameDetailWithAnswers> {
  const headers = await getAuthHeaders();
  const response = await fetch(apiUrl(`/api/my-games/${token}/`), { method: 'GET', headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) throw new Error('Unauthorized');
    const msg = data.detail ?? data.error ?? data.message ?? 'Failed to load game';
    throw new Error(typeof msg === 'string' ? msg : 'Failed to load game');
  }
  return data as GameDetailWithAnswers;
}
