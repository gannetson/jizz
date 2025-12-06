import { ApiClient } from '../client';

export interface FlagService {
  flagQuestion(questionId: number, playerToken: string, description: string): Promise<unknown>;
  flagMedia(mediaId: number, playerToken: string, description?: string): Promise<unknown>;
}

export class FlagServiceImpl implements FlagService {
  constructor(private client: ApiClient) {}

  async flagQuestion(questionId: number, playerToken: string, description: string): Promise<unknown> {
    return this.client.post('/api/flag/', {
      question_id: questionId,
      player_token: playerToken,
      description,
    });
  }

  async flagMedia(mediaId: number, playerToken: string, description?: string): Promise<unknown> {
    return this.client.post('/api/flag-media/', {
      media_id: mediaId,
      player_token: playerToken,
      description: description || '',
    });
  }
}

