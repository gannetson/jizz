import { apiUrl } from './config';

export type TaxOrderRow = {
  tax_order: string;
  count: number;
};

export type TaxFamilyRow = {
  tax_family: string;
  tax_family_en: string;
  count: number;
};

export async function loadTaxOrders(countryCode?: string): Promise<TaxOrderRow[]> {
  const path = countryCode
    ? `/api/orders/?country=${encodeURIComponent(countryCode)}`
    : '/api/orders/';
  const response = await fetch(apiUrl(path), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return [];
  const data = await response.json().catch(() => []);
  return Array.isArray(data) ? data : [];
}

export async function loadTaxFamilies(countryCode?: string): Promise<TaxFamilyRow[]> {
  const path = countryCode
    ? `/api/families/?country=${encodeURIComponent(countryCode)}`
    : '/api/families/';
  const response = await fetch(apiUrl(path), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return [];
  const data = await response.json().catch(() => []);
  return Array.isArray(data) ? data : [];
}
