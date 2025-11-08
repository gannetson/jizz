// Mock implementations of API services for testing
import { ApiClient } from '../../api/client';
import { Services, createServices } from '../../api/services';
import { Player, Game, Species, Country, Language, TaxOrder, TaxFamily, CountryChallenge, Question } from '../../api/types';

export class MockApiClient extends ApiClient {
  private mockResponses: Map<string, unknown> = new Map();

  setMockResponse(endpoint: string, method: string, response: unknown): void {
    const key = `${method}:${endpoint}`;
    this.mockResponses.set(key, response);
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const method = options.method || 'GET';
    const key = `${method}:${endpoint}`;
    const mockResponse = this.mockResponses.get(key);

    if (mockResponse) {
      return Promise.resolve(mockResponse as T);
    }

    // Default mock responses
    return Promise.resolve({} as T);
  }
}

export function createMockServices(client?: MockApiClient): Services {
  const mockClient = client || new MockApiClient();
  return createServices(mockClient);
}

// Helper to create mock data
export const mockData = {
  player: (overrides?: Partial<Player>): Player => ({
    id: 1,
    name: 'Test Player',
    token: 'test-token',
    language: 'en',
    ...overrides,
  }),

  game: (overrides?: Partial<Game>): Game => ({
    id: 1,
    token: 'test-game-token',
    ...overrides,
  }),

  species: (overrides?: Partial<Species>): Species => ({
    id: 1,
    name: 'Test Species',
    code: 'testcode',
    images: [],
    ...overrides,
  }),

  country: (overrides?: Partial<Country>): Country => ({
    code: 'NL',
    name: 'Netherlands',
    ...overrides,
  }),

  language: (overrides?: Partial<Language>): Language => ({
    code: 'en',
    name: 'English',
    ...overrides,
  }),
};

