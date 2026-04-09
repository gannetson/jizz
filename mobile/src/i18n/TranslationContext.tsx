import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTranslation, type Locale } from './translations';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../api/profile';
import { getAccessToken, ensureFreshAccessToken } from '../api/auth';
import { useProfile } from '../context/ProfileContext';
import { useGame } from '../context/GameContext';
import * as playerApi from '../api/player';
import { getSpeciesLanguageIndependent } from './speciesLanguagePreference';

const LOCALE_KEY = 'app_locale';

type TranslationContextType = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { refreshProfile, profile, ready: profileReady } = useProfile();
  const { language: gameLanguage, setLanguage, player, setPlayer } = useGame();
  const [locale, setLocaleState] = useState<Locale>('en');
  /** False until LOCALE_KEY (or profile fallback) has been read — avoids sync effect using default 'en' and overwriting species language. */
  const [localeHydrated, setLocaleHydrated] = useState(false);

  const applyAppLocaleToSpeciesLanguage = useCallback(
    async (l: Locale) => {
      setLanguage(l);
      try {
        const token = await getAccessToken();
        if (token) {
          await updateProfile({ language: l });
          refreshProfile();
        }
      } catch {
        /* ignore */
      }
      try {
        const access = await ensureFreshAccessToken();
        if (player && access) {
          const updated = await playerApi.updatePlayer(
            player.token,
            { name: player.name, language: l },
            access
          );
          if (updated) setPlayer(updated);
        }
      } catch {
        /* ignore */
      }
    },
    [setLanguage, player, setPlayer, refreshProfile]
  );

  const setLocale = useCallback(
    async (l: Locale) => {
      setLocaleState(l);
      try {
        await AsyncStorage.setItem(LOCALE_KEY, l);
      } catch {
        /* ignore */
      }
      const indep = await getSpeciesLanguageIndependent();
      if (!indep) {
        await applyAppLocaleToSpeciesLanguage(l);
      }
      /* Independent species language: UI locale only — do not read or PATCH player. */
    },
    [applyAppLocaleToSpeciesLanguage]
  );

  useEffect(() => {
    let cancelled = false;
    setLocaleHydrated(false);
    (async () => {
      const stored = await AsyncStorage.getItem(LOCALE_KEY);
      if (cancelled) return;
      if (stored === 'nl' || stored === 'en') {
        setLocaleState(stored);
      } else if (isAuthenticated) {
        if (!profileReady) return;
        const lang = profile?.language;
        if (lang === 'nl' || lang === 'en') {
          setLocaleState(lang);
          await AsyncStorage.setItem(LOCALE_KEY, lang).catch(() => {});
        }
      }
      if (!cancelled) setLocaleHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, profileReady, profile?.language]);

  useEffect(() => {
    if (!localeHydrated) return;
    let cancelled = false;
    (async () => {
      const indep = await getSpeciesLanguageIndependent();
      if (cancelled || indep) return;
      if (locale !== 'en' && locale !== 'nl') return;
      if (gameLanguage === locale) return;
      await applyAppLocaleToSpeciesLanguage(locale);
    })();
    return () => {
      cancelled = true;
    };
  }, [localeHydrated, locale, gameLanguage, applyAppLocaleToSpeciesLanguage]);

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
