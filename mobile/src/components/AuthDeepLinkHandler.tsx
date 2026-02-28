import React, { useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import { useAuth } from '../context/AuthContext';

/**
 * Listens for OAuth redirect deep links (birdr://auth/google, birdr://auth/apple)
 * when the app is opened from the system browser after sign-in.
 */
export function AuthDeepLinkHandler({ children }: { children: React.ReactNode }) {
  const { handleOAuthRedirect } = useAuth();
  const handled = useRef(false);

  useEffect(() => {
    const processUrl = async (url: string | null) => {
      if (!url || !url.startsWith('birdr://auth/')) return;
      if (handled.current) return;
      handled.current = true;
      await handleOAuthRedirect(url);
    };

    Linking.getInitialURL().then(processUrl);

    const sub = Linking.addEventListener('url', (e) => {
      processUrl(e.url);
    });
    return () => sub.remove();
  }, [handleOAuthRedirect]);

  return <>{children}</>;
}
