import { ApiClient } from '../client';
import { CountryChallenge, Species } from '../types';

export interface ChallengeService {
  startCountryChallenge(countryCode: string, playerToken: string): Promise<CountryChallenge>;
  getCurrentChallenge(playerToken: string): Promise<CountryChallenge>;
  submitAnswer(questionId: number, answerId: number, playerToken: string): Promise<unknown>;
  getNextLevel(challengeId: number, playerToken: string): Promise<unknown>;
}

export class ChallengeServiceImpl implements ChallengeService {
  constructor(private client: ApiClient) {}

  async startCountryChallenge(countryCode: string, playerToken: string): Promise<CountryChallenge> {
    return this.client.post<CountryChallenge>(
      '/api/country-challenges/',
      { country_code: countryCode },
      {
        headers: {
          'Authorization': `Token ${playerToken}`,
        },
      }
    );
  }

  async getCurrentChallenge(playerToken: string): Promise<CountryChallenge> {
    return this.client.get<CountryChallenge>('/api/country-challenges/current/', {
      headers: {
        'Authorization': `Token ${playerToken}`,
      },
    });
  }

  async submitAnswer(questionId: number, answerId: number, playerToken: string): Promise<unknown> {
    return this.client.post('/api/answer/', {
      question_id: questionId,
      answer_id: answerId,
      player_token: playerToken,
    }, {
      headers: {
        'Authorization': `Token ${playerToken}`,
      },
    });
  }

  async getNextLevel(challengeId: number, playerToken: string): Promise<unknown> {
    const hash = new Date().getTime();
    return this.client.post(`/api/challenge/${challengeId}/next-level?${hash}`, undefined, {
      headers: {
        'Authorization': `Token ${playerToken}`,
      },
    });
  }
}

