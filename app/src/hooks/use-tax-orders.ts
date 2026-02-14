import { useState, useEffect } from 'react';
import { useServices } from '../contexts/services.context';
import { TaxOrder } from '../api/types';

export function useTaxOrders(countryCode?: string) {
  const { taxonomy: taxonomyService } = useServices();
  const [taxOrders, setTaxOrders] = useState<TaxOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setTaxOrders([]); // Reset when country changes

    taxonomyService
      .getTaxOrders(countryCode)
      .then((data) => {
        if (!cancelled) {
          setTaxOrders(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [taxonomyService, countryCode]);

  return { taxOrders, loading, error };
}

