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
 * - Daily challenge invite: birdr://join/challenge/{invite_token} or https://birdr.pro/join/challenge/{invite_token}
 */
export function DeepLinkHandler({ children }: { children: React.ReactNode }) {
  const { handleOAuthRedirect, isAuthenticated } = useAuth();
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

      const challengeInviteToken = parseChallengeInviteUrl(url);
      if (challengeInviteToken) {
        handled.current = url;
        try {
          const { acceptChallengeByToken } = await import('../api/dailyChallenge');
          if (isAuthenticated) {
            const challenge = await acceptChallengeByToken(challengeInviteToken);
            navigation.navigate('DailyChallengeDetail', { challengeId: challenge.id });
          } else {
            navigation.navigate('Login');
          }
        } catch {
          navigation.navigate('Home');
        }
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
      if (e.url !== handled.current) processUrl(e.url);
    });
    return () => sub.remove();
  }, [handleOAuthRedirect, loadGame, setGame, navigation, isAuthenticated]);

  return <>{children}</>;
}

function parseGameJoinUrl(url: string): string | null {
  // Don't treat join/challenge/... as game join
  if (url.includes('/join/challenge/')) return null;
  // birdr://join/{token}
  const schemeMatch = url.match(/^birdr:\/\/join\/([a-z]{6,12})$/);
  if (schemeMatch) return schemeMatch[1];

  // https://birdr.pro/join/{token}
  const base = API_BASE_URL.replace(/\/$/, '');
  if (url.startsWith(base + '/join/')) {
    const path = url.slice(base.length);
    const match = path.match(/^\/join\/([a-z]{6,12})/);
    if (match) return match[1];
  }

  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/^\/join\/([a-z]{6,12})$/);
    if (match) return match[1];
  } catch {}

  return null;
}

/** Parse daily challenge invite URL; returns invite_token or null. */
function parseChallengeInviteUrl(url: string): string | null {
  // birdr://join/challenge/{token}
  const schemeMatch = url.match(/^birdr:\/\/join\/challenge\/([\w-]+)$/);
  if (schemeMatch) return schemeMatch[1];

  const base = API_BASE_URL.replace(/\/$/, '');
  if (url.startsWith(base + '/join/challenge/')) {
    const token = url.slice((base + '/join/challenge/').length).replace(/[/?#].*$/, '');
    if (/^[\w-]+$/.test(token)) return token;
  }

  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/^\/join\/challenge\/([\w-]+)$/);
    if (match) return match[1];
  } catch {}

  return null;
}
