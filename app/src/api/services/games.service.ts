import axios from '../axios-config';
import { Game } from '../../core/app-context';
import { getApiBaseUrl } from '../baseUrl';

export interface PaginatedGamesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Game[];
}

export interface QuestionWithAnswer {
  id: number;
  sequence: number;
  number: number;
  species: {
    name: string;
    name_latin: string;
    name_nl?: string;
    name_translated?: string;
    code: string;
    id: number;
    images?: Array<{ url: string; link?: string; contributor?: string }>;
    videos?: Array<{ url: string; link?: string; contributor?: string }>;
    sounds?: Array<{ url: string; link?: string; contributor?: string }>;
  };
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
}

export interface GameDetailWithAnswers {
  token: string;
  country: {
    code: string;
    name: string;
    count?: number;
  };
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
}

class GamesService {
  private get baseURL(): string {
    return getApiBaseUrl();
  }

  /**
   * Get paginated list of games played by the authenticated user
   */
  async getMyGames(page: number = 1): Promise<PaginatedGamesResponse> {
    try {
      const response = await axios.get<PaginatedGamesResponse>(
        `${this.baseURL}/api/my-games/`,
        {
          params: {
            page: page,
          },
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Get game details with all questions and user's answers
   */
  async getGameDetail(token: string): Promise<GameDetailWithAnswers> {
    try {
      const response = await axios.get<GameDetailWithAnswers>(
        `${this.baseURL}/api/my-games/${token}/`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (axios.isAxiosError(error) && error.response) {
      const message = error.response.data?.error || 
                     error.response.data?.detail || 
                     error.response.data?.message || 
                     'Failed to load games.';
      return new Error(message);
    }
    return new Error('An unexpected error occurred.');
  }
}

export const gamesService = new GamesService();

