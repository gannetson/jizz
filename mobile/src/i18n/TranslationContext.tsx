import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTranslation, type Locale } from './translations';
import { useAuth } from '../context/AuthContext';
import { getProfile, updateProfile } from '../api/profile';
import { getAccessToken } from '../api/auth';
import { useProfile } from '../context/ProfileContext';

const LOCALE_KEY = 'app_locale';

type TranslationContextType = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { refreshProfile } = useProfile();
  const [locale, setLocaleState] = useState<Locale>('en');

  const setLocale = useCallback(async (l: Locale) => {
    setLocaleState(l);
    try {
      await AsyncStorage.setItem(LOCALE_KEY, l);
    } catch {
      /* ignore */
    }
    try {
      const token = await getAccessToken();
      if (token) {
        await updateProfile({ language: l });
        refreshProfile();
      }
    } catch {
      /* ignore if profile update fails */
    }
  }, [refreshProfile]);

  useEffect(() => {
    AsyncStorage.getItem(LOCALE_KEY).then((stored) => {
      if (stored === 'nl' || stored === 'en') {
        setLocaleState(stored);
        return;
      }
      if (isAuthenticated) {
        getProfile()
          .then((p) => {
            if (p.language === 'nl' || p.language === 'en') {
              setLocaleState(p.language);
              AsyncStorage.setItem(LOCALE_KEY, p.language).catch(() => {});
            }
          })
          .catch(() => {});
      }
    });
  }, [isAuthenticated]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => getTranslation(locale, key, params),
    [locale]
  );

  return (
    <TranslationContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(TranslationContext);
  if (!ctx) throw new Error('useTranslation must be used within TranslationProvider');
  return ctx;
}
