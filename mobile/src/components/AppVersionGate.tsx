import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, View, StyleSheet } from 'react-native';
import { fetchAppVersionRequirements } from '../api/appVersion';
import { getAppVersionDisplay } from '../utils/appVersion';
import { isVersionLessThan } from '../utils/compareVersions';
import { ForceUpdateScreen } from './ForceUpdateScreen';
import { colors } from '../theme';

type Props = {
  children: React.ReactNode;
};

/**
 * Blocks the app when the installed build is below the API min_version.
 * On fetch failure, allows the app to run (fail open).
 */
export function AppVersionGate({ children }: Props) {
  const [checking, setChecking] = useState(true);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [minVersion, setMinVersion] = useState('1.64.0');
  const [storeUrls, setStoreUrls] = useState<{ ios: string; android: string } | null>(null);

  const runCheck = useCallback(async (showLoading: boolean) => {
    if (showLoading) setChecking(true);
    const requirements = await fetchAppVersionRequirements();
    if (requirements?.min_version) {
      const { version } = getAppVersionDisplay();
      setMinVersion(requirements.min_version);
      setStoreUrls({
        ios: requirements.app_store_url,
        android: requirements.play_store_url,
      });
      setNeedsUpdate(isVersionLessThan(version, requirements.min_version));
    }
    if (showLoading) setChecking(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await runCheck(true);
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [runCheck]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void runCheck(false);
      }
    });
    return () => sub.remove();
  }, [runCheck]);

  if (checking) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary[700]} />
      </View>
    );
  }

  if (needsUpdate) {
    return (
      <ForceUpdateScreen
        minVersion={minVersion}
        appStoreUrl={storeUrls?.ios}
        playStoreUrl={storeUrls?.android}
      />
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f0e8',
  },
});
