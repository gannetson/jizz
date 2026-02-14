import { ApiClient } from '../client';
import { Language } from '../types';

export interface LanguageService {
  getLanguages(): Promise<Language[]>;
}

export class LanguageServiceImpl implements LanguageService {
  constructor(private client: ApiClient) {}

  async getLanguages(): Promise<Language[]> {
    return this.client.get<Language[]>('/api/languages/');
  }
}

