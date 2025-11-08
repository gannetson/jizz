import { useState, useEffect } from 'react';
import { useServices } from '../contexts/services.context';
import { Language } from '../api/types';

export function useLanguages() {
  const { language: languageService } = useServices();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    languageService
      .getLanguages()
      .then((data) => {
        if (!cancelled) {
          setLanguages(data);
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
  }, [languageService]);

  return { languages, loading, error };
}

