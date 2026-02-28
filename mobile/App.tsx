import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { MenuProvider } from './src/context/MenuContext';
import { GameProvider } from './src/context/GameContext';
import { GameWebSocketProvider } from './src/context/GameWebSocketContext';
import { AuthProvider } from './src/context/AuthContext';
import { ProfileProvider } from './src/context/ProfileContext';
import { TranslationProvider } from './src/i18n/TranslationContext';
import { AuthDeepLinkHandler } from './src/components/AuthDeepLinkHandler';
import AppNavigator from './src/navigation/AppNavigator';
import { GOOGLE_WEB_CLIENT_ID } from './src/api/config';

export default function App() {
  useEffect(() => {
    const webClientId = GOOGLE_WEB_CLIENT_ID?.trim() || undefined;
    GoogleSignin.configure({
      webClientId: webClientId ?? undefined,
      // offlineAccess requires a server Web client ID; only enable when we have it
      offlineAccess: !!webClientId,
    });
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        <AuthProvider>
          <ProfileProvider>
            <TranslationProvider>
              <AuthDeepLinkHandler>
                <GameProvider>
                <GameWebSocketProvider>
                  <MenuProvider>
                    <AppNavigator />
                  </MenuProvider>
                </GameWebSocketProvider>
              </GameProvider>
              </AuthDeepLinkHandler>
            </TranslationProvider>
          </ProfileProvider>
        </AuthProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
