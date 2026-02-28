import React, { useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { API_BASE_URL } from '../api/config';

/**
 * Handles deep links:
 * - OAuth redirects: birdr://auth/google, birdr://auth/apple
 * - Game join: https://birdr.pro/join/{token} or birdr://join/{token}
 */
export function DeepLinkHandler({ children }: { children: React.ReactNode }) {
  const { handleOAuthRedirect } = useAuth();
  const { loadGame, setGame } = useGame();
  const navigation = useNavigation<any>();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    const processUrl = async (url: string | null) => {
      if (!url) return;
      if (handled.current === url) return;

      if (url.startsWith('birdr://auth/')) {
        handled.current = url;
        await handleOAuthRedirect(url);
        return;
      }

      const token = parseGameJoinUrl(url);
      if (token) {
        handled.current = url;
        const game = await loadGame(token);
        if (game) {
          setGame(game);
          navigation.navigate('Lobby');
        }
      }
    };

    Linking.getInitialURL().then(processUrl);

    const sub = Linking.addEventListener('url', (e) => {
      // Only process if this is a different URL than we already handled (avoid double-processing initial URL)
      if (e.url !== handled.current) processUrl(e.url);
    });
    return () => sub.remove();
  }, [handleOAuthRedirect, loadGame, setGame, navigation]);

  return <>{children}</>;
}

function parseGameJoinUrl(url: string): string | null {
  // birdr://join/{token}
  const schemeMatch = url.match(/^birdr:\/\/join\/([a-z]{6,12})$/);
  if (schemeMatch) return schemeMatch[1];

  // https://birdr.pro/join/{token}
  const base = API_BASE_URL.replace(/\/$/, '');
  if (url.startsWith(base + '/join/')) {
    const token = url.slice((base + '/join/').length).replace(/[/?#].*$/, '');
    if (/^[a-z]{6,12}$/.test(token)) return token;
  }

  // Generic https://*/join/{token} fallback
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/^\/join\/([a-z]{6,12})$/);
    if (match) return match[1];
  } catch {}

  return null;
}
