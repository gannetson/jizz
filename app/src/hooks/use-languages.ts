import { useState, useEffect } from 'react';
import { useServices } from '../contexts/services.context';
import { Language } from '../api/types';
import { withScientificLanguage } from '../data/language-names-nl';

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
          setLanguages(withScientificLanguage(Array.isArray(data) ? data : []));
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

