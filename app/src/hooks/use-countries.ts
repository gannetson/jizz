import { useState, useEffect } from 'react';
import { useServices } from '../contexts/services.context';
import { Country } from '../api/types';

export function useCountries() {
  const { country: countryService } = useServices();
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    countryService
      .getCountries()
      .then((data) => {
        if (!cancelled) {
          setCountries(data);
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
  }, [countryService]);

  return { countries, loading, error };
}

