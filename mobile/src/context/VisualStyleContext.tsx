import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProfile } from './ProfileContext';
import { useAuth } from './AuthContext';
import {
  DEFAULT_VISUAL_STYLE,
  VISUAL_STYLE_STORAGE_KEY,
  parseVisualStyle,
  type VisualStyle,
} from '../lib/visualStyle';

type VisualStyleContextType = {
  visualStyle: VisualStyle;
  setVisualStyle: (style: VisualStyle) => void;
};

const VisualStyleContext = createContext<VisualStyleContextType | undefined>(undefined);

export function VisualStyleProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { profile } = useProfile();
  const [visualStyle, setVisualStyleState] = useState<VisualStyle>(DEFAULT_VISUAL_STYLE);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(VISUAL_STYLE_STORAGE_KEY);
        if (!cancelled && stored) {
          setVisualStyleState(parseVisualStyle(stored));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !profile?.visual_style) return;
    const next = parseVisualStyle(profile.visual_style);
    setVisualStyleState(next);
    AsyncStorage.setItem(VISUAL_STYLE_STORAGE_KEY, next).catch(() => {});
  }, [isAuthenticated, profile?.visual_style]);

  const setVisualStyle = useCallback((style: VisualStyle) => {
    const next = parseVisualStyle(style);
    setVisualStyleState(next);
    AsyncStorage.setItem(VISUAL_STYLE_STORAGE_KEY, next).catch(() => {});
  }, []);

  return (
    <VisualStyleContext.Provider value={{ visualStyle, setVisualStyle }}>
      {children}
    </VisualStyleContext.Provider>
  );
}

export function useVisualStyle() {
  const ctx = useContext(VisualStyleContext);
  if (!ctx) throw new Error('useVisualStyle must be used within VisualStyleProvider');
  return ctx;
}
