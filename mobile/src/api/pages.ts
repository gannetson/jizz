import { apiUrl } from './config';

export type PageListItem = {
  id: number;
  title: string;
  slug: string;
};

export type PageDetail = {
  id: number;
  title: string;
  slug: string;
  content: string;
  show: boolean;
};

export async function loadHelpPages(): Promise<PageListItem[]> {
  const response = await fetch(apiUrl('/api/pages/'), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to load help pages');
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export async function loadHelpPage(slug: string): Promise<PageDetail> {
  const response = await fetch(apiUrl(`/api/pages/${encodeURIComponent(slug)}/`), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Page not found');
  return response.json();
}
