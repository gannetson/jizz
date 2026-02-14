import { ApiClient } from '../client';
import { Species } from '../types';

export interface SpeciesService {
  getSpeciesByCountry(countryCode: string, language: string): Promise<Species[]>;
}

export class SpeciesServiceImpl implements SpeciesService {
  constructor(private client: ApiClient) {}

  async getSpeciesByCountry(countryCode: string, language: string): Promise<Species[]> {
    return this.client.get<Species[]>(
      `/api/species/?countryspecies__country=${countryCode}&language=${language}`
    );
  }
}

