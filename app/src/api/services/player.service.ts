import { ApiClient } from '../client';
import { Player } from '../types';

export interface PlayerService {
  createPlayer(name: string, language: string): Promise<Player>;
  loadPlayer(token: string): Promise<Player>;
  updatePlayer(token: string, data: { name?: string; language?: string }): Promise<Player>;
}

export class PlayerServiceImpl implements PlayerService {
  constructor(private client: ApiClient) {}

  async createPlayer(name: string, language: string): Promise<Player> {
    return this.client.post<Player>('/api/player/', { name, language });
  }

  async loadPlayer(token: string): Promise<Player> {
    return this.client.get<Player>(`/api/player/${token}/`);
  }

  async updatePlayer(token: string, data: { name?: string; language?: string }): Promise<Player> {
    return this.client.patch<Player>(`/api/player/${token}/`, data);
  }
}

