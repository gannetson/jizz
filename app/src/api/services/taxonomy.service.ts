import { ApiClient } from '../client';
import { TaxFamily, TaxOrder } from '../types';

export interface TaxonomyService {
  getTaxOrders(countryCode?: string): Promise<TaxOrder[]>;
  getTaxFamilies(countryCode?: string): Promise<TaxFamily[]>;
}

export class TaxonomyServiceImpl implements TaxonomyService {
  constructor(private client: ApiClient) {}

  async getTaxOrders(countryCode?: string): Promise<TaxOrder[]> {
    const url = countryCode ? `/api/orders/?country=${countryCode}` : '/api/orders/';
    return this.client.get<TaxOrder[]>(url);
  }

  async getTaxFamilies(countryCode?: string): Promise<TaxFamily[]> {
    const url = countryCode ? `/api/families/?country=${countryCode}` : '/api/families/';
    return this.client.get<TaxFamily[]>(url);
  }
}

