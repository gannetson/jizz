import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';
import { MenuProvider } from './src/context/MenuContext';
import { GameProvider } from './src/context/GameContext';
import { GameWebSocketProvider } from './src/context/GameWebSocketContext';
import { AuthProvider } from './src/context/AuthContext';
import { ProfileProvider } from './src/context/ProfileContext';
import { TranslationProvider } from './src/i18n/TranslationContext';
import { DeepLinkHandler } from './src/components/DeepLinkHandler';
import AppNavigator from './src/navigation/AppNavigator';
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from './src/api/config';

export default function App() {
  useEffect(() => {
    const webClientId = GOOGLE_WEB_CLIENT_ID?.trim() || undefined;
    GoogleSignin.configure({
      webClientId: webClientId ?? undefined,
      ...(Platform.OS === 'ios' && GOOGLE_IOS_CLIENT_ID
        ? { iosClientId: GOOGLE_IOS_CLIENT_ID.trim() }
        : {}),
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
              <GameProvider>
                <GameWebSocketProvider>
                  <DeepLinkHandler>
                    <MenuProvider>
                      <AppNavigator />
                    </MenuProvider>
                  </DeepLinkHandler>
                </GameWebSocketProvider>
              </GameProvider>
            </TranslationProvider>
          </ProfileProvider>
        </AuthProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
