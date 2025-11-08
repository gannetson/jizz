import { useState, useEffect } from 'react';
import { useServices } from '../contexts/services.context';
import { TaxFamily } from '../api/types';

export function useTaxFamilies(countryCode?: string) {
  const { taxonomy: taxonomyService } = useServices();
  const [taxFamilies, setTaxFamilies] = useState<TaxFamily[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setTaxFamilies([]); // Reset when country changes

    taxonomyService
      .getTaxFamilies(countryCode)
      .then((data) => {
        if (!cancelled) {
          setTaxFamilies(data);
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

  return { taxFamilies, loading, error };
}

