import { ApiClient } from '../client';

export interface MediaItem {
  id: number;
  type: 'image' | 'video' | 'audio';
  source: string;
  url: string;
  link?: string | null;
  contributor?: string | null;
  copyright_text?: string | null;
  copyright_standardized?: string | null;
  non_commercial_only?: boolean;
  species_name: string;
  species_code: string;
  species_id: number;
  hide: boolean;
  created: string;
}

export interface PaginatedMediaResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: MediaItem[];
}

export interface SpeciesReviewStats {
  id: number;
  name: string;
  total_media: number;
  unreviewed: number;
  approved: number;
  rejected: number;
  not_sure: number;
}

export interface SpeciesReviewStatsResponse {
  summary: {
    fully_reviewed: number;
    partly_reviewed: number;
    not_reviewed: number;
  };
  species: SpeciesReviewStats[];
}

export interface MediaService {
  getMedia(type?: string, page?: number, countryCode?: string, language?: string): Promise<PaginatedMediaResponse>;
  /** Pass playerToken when using a game player; omit when authenticated as a user (JWT). */
  reviewMedia(mediaId: number, playerToken: string | undefined, reviewType: 'approved' | 'rejected' | 'not_sure', description?: string): Promise<unknown>;
  getSpeciesReviewStats(countryCode?: string, mediaType?: string, language?: string): Promise<SpeciesReviewStatsResponse>;
}

export class MediaServiceImpl implements MediaService {
  constructor(private client: ApiClient) {}

  async getMedia(type: string = 'image', page: number = 1, countryCode?: string, language?: string): Promise<PaginatedMediaResponse> {
    let url = `/api/media/?type=${type}&page=${page}`;
    if (countryCode) {
      url += `&country=${countryCode}`;
    }
    if (language) {
      url += `&language=${encodeURIComponent(language)}`;
    }
    const response = await this.client.get<PaginatedMediaResponse>(url);
    return response;
  }

  async reviewMedia(mediaId: number, playerToken: string | undefined, reviewType: 'approved' | 'rejected' | 'not_sure', description?: string): Promise<unknown> {
    const body: Record<string, unknown> = {
      media_id: mediaId,
      review_type: reviewType,
      description: description || '',
    };
    if (playerToken != null) {
      body.player_token = playerToken;
    }
    return this.client.post('/api/review-media/', body);
  }

  async getSpeciesReviewStats(countryCode?: string, mediaType: string = 'image', language?: string): Promise<SpeciesReviewStatsResponse> {
    const params = new URLSearchParams({ type: mediaType });
    if (countryCode) params.set('country', countryCode);
    if (language) params.set('language', language);
    return this.client.get<SpeciesReviewStatsResponse>(`/api/species-review-stats/?${params.toString()}`);
  }
}

