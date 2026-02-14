import { ApiClient } from '../client';
import { Country } from '../types';

export interface CountryService {
  getCountries(): Promise<Country[]>;
}

export class CountryServiceImpl implements CountryService {
  constructor(private client: ApiClient) {}

  async getCountries(): Promise<Country[]> {
    return this.client.get<Country[]>('/api/countries/');
  }
}

