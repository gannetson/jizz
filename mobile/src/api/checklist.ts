import { apiUrl, API_BASE_URL } from './config';
import { getAuthHeaders } from './auth';
import { readApiErrorMessage } from './apiError';

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

export type ChecklistProgress = {
  identified_count: number;
  total_count: number;
  percent: number;
  next_milestone: number | null;
};

export type ChecklistResponse = {
  country: { code: string; name: string };
  totals: ChecklistTotals;
  progress: ChecklistProgress;
  tax_orders: { tax_order: string; count: number }[];
  species: ChecklistSpecies[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    has_next: boolean;
  };
  source: string;
};

export type ChecklistQuery = {
  country_code?: string;
  status?: string;
  tax_order?: string;
  sort?: 'recent' | 'species' | 'name' | 'rarity';
  search?: string;
  page?: number;
  page_size?: number;
  language?: string;
};

function buildChecklistUrl(query: ChecklistQuery): string {
  const params = new URLSearchParams();
  if (query.country_code) params.set('country_code', query.country_code);
  if (query.status) params.set('status', query.status);
  if (query.tax_order) params.set('tax_order', query.tax_order);
  if (query.sort) params.set('sort', query.sort);
  if (query.search) params.set('search', query.search);
  if (query.page != null) params.set('page', String(query.page));
  if (query.page_size != null) params.set('page_size', String(query.page_size));
  if (query.language) params.set('language', query.language);
  const qs = params.toString();
  return `${apiUrl('/api/checklist/')}${qs ? `?${qs}` : ''}`;
}

export async function fetchChecklist(query: ChecklistQuery = {}): Promise<ChecklistResponse> {
  const headers = await getAuthHeaders();
  const url = buildChecklistUrl(query);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        ...headers,
        Accept: 'application/json',
      },
    });
  } catch (e) {
    const hint =
      __DEV__ && API_BASE_URL.includes('10.0.2.2')
        ? ' Check that Django is running and reachable from the emulator.'
        : '';
    throw new Error(
      `Could not reach the server at ${API_BASE_URL}.${hint} ${e instanceof Error ? e.message : ''}`.trim()
    );
  }

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, 'Failed to load checklist'));
  }
  return response.json() as Promise<ChecklistResponse>;
}
