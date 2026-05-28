import axios from './axios-config';
import { getApiBaseUrl } from './baseUrl';

export type ChecklistStatus = 'identified' | 'missed' | 'unseen';

export type ChecklistSpecies = {
  id: number;
  code: string;
  name: string;
  name_latin: string;
  name_nl?: string | null;
  name_translated?: string;
  tax_order?: string | null;
  status: ChecklistStatus;
  frequency?: string | null;
  times_encountered: number;
  times_identified: number;
  last_encountered_at: string | null;
  last_identified_at: string | null;
  illustration_url?: string | null;
};

export type ChecklistTotals = {
  all: number;
  identified: number;
  missed: number;
  unseen: number;
  very_rare: number;
};

export type ChecklistResponse = {
  country: { code: string; name: string };
  totals: ChecklistTotals;
  progress: {
    identified_count: number;
    total_count: number;
    percent: number;
    next_milestone: number | null;
  };
  tax_orders: { tax_order: string; count: number }[];
  species: ChecklistSpecies[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    has_next: boolean;
  };
};

export type ChecklistQuery = {
  country_code?: string;
  status?: string;
  tax_order?: string;
  sort?: string;
  page?: number;
  page_size?: number;
  language?: string;
};

export async function fetchChecklist(query: ChecklistQuery = {}): Promise<ChecklistResponse> {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const response = await axios.get<ChecklistResponse>(`${base}/api/checklist/`, { params: query });
  return response.data;
}
