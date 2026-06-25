import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchAppVersionRequirements } from '../api/appVersion';
import { APP_STORE_URL, PLAY_STORE_URL } from '../constants/storeUrls';
import { getAppVersionDisplay } from '../utils/appVersion';
import { isSoftUpdateAvailable } from '../utils/softUpdate';

type SoftUpdateState = {
  available: boolean;
  storeLabel: string | null;
  storeUrl: string;
};

const INITIAL: SoftUpdateState = {
  available: false,
  storeLabel: null,
  storeUrl: Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL,
};

export function useSoftUpdateAvailable(): SoftUpdateState {
  const [state, setState] = useState<SoftUpdateState>(INITIAL);

  const runCheck = useCallback(async () => {
    const requirements = await fetchAppVersionRequirements();
    if (!requirements) return;

    const storeLabel =
      Platform.OS === 'ios'
        ? requirements.store_release_label_ios
        : requirements.store_release_label_android;
    const { codename } = getAppVersionDisplay();
    const storeUrl =
      Platform.OS === 'ios'
        ? requirements.app_store_url || APP_STORE_URL
        : requirements.play_store_url || PLAY_STORE_URL;

    setState({
      available: isSoftUpdateAvailable(codename, storeLabel),
      storeLabel: storeLabel?.trim() || null,
      storeUrl,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      void runCheck();
    }, [runCheck]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void runCheck();
      }
    });
    return () => sub.remove();
  }, [runCheck]);

  return state;
}
