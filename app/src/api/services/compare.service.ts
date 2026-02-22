import axios from '../axios-config';
import { getApiBaseUrl } from '../baseUrl';

export interface SpeciesComparison {
  id: number;
  comparison_type: string;
  species_1: {
    id: number;
    name: string;
    name_latin: string;
  };
  species_2: {
    id: number;
    name: string;
    name_latin: string;
  };
  species_1_name: string;
  species_2_name: string;
  summary: string;
  summary_html?: string;
  detailed_comparison: string;
  detailed_comparison_html?: string;
  size_comparison?: string;
  size_comparison_html?: string;
  plumage_comparison?: string;
  plumage_comparison_html?: string;
  behavior_comparison?: string;
  behavior_comparison_html?: string;
  habitat_comparison?: string;
  habitat_comparison_html?: string;
  vocalization_comparison?: string;
  vocalization_comparison_html?: string;
  identification_tips?: string;
  identification_tips_html?: string;
  generated_at: string;
  ai_model: string;
}

class CompareService {
  private get baseURL(): string {
    return getApiBaseUrl();
  }

  /**
   * Get or generate a comparison between two species
   * Will scrape species if traits don't exist
   */
  async getComparison(species1Id: number, species2Id: number): Promise<SpeciesComparison> {
    try {
      const response = await axios.post<SpeciesComparison>(
        `${this.baseURL}/api/compare/request/`,
        {
          comparison_type: 'species',
          species_1_id: species1Id,
          species_2_id: species2Id,
        },
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
                     'Failed to generate comparison.';
      return new Error(message);
    }
    return new Error('An unexpected error occurred.');
  }
}

export const compareService = new CompareService();

