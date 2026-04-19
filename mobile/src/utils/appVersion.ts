import { Platform } from 'react-native';
import Constants from 'expo-constants';

/** Set in app.config.js from app.json `expo.releaseCodename`. */
type Extra = { releaseCodename?: string } | undefined;

function getExtra(): Extra {
  return (
    Constants.expoConfig?.extra ??
    (Constants.manifest as { extra?: Extra } | null)?.extra
  ) as Extra;
}

function expoVersion(): string {
  return (
    Constants.expoConfig?.version ?? (Constants.manifest as { version?: string } | null)?.version ?? '—'
  );
}

function expoBuild(): string | null {
  return Platform.select({
    ios: Constants.expoConfig?.ios?.buildNumber ?? null,
    android:
      Constants.expoConfig?.android?.versionCode != null
        ? String(Constants.expoConfig.android.versionCode)
        : null,
  });
}

/**
 * iOS build from Info.plist (`CFBundleVersion`) via expo-constants — not the embedded dev-client
 * manifest, so it matches Settings even when `expoConfig` is stale. Does not require expo-application.
 */
function iosNativeBuildNumber(): string | null {
  const bn = Constants.platform?.ios?.buildNumber;
  return bn != null && String(bn).length > 0 ? String(bn) : null;
}

/**
 * Marketing version, native build, and release codename.
 * Semver comes from app config (embedded manifest). On iOS, build number prefers native plist via
 * `Constants.platform.ios.buildNumber`. Android semver stays on app config; native `versionName` is
 * the bird codename, not 1.x.y.
 */
export function getAppVersionDisplay(): {
  version: string;
  build: string | null;
  codename: string | null;
} {
  const version = expoVersion();

  const build =
    Platform.OS === 'ios'
      ? iosNativeBuildNumber() ?? expoBuild() ?? null
      : expoBuild() ?? null;

  const raw = getExtra()?.releaseCodename?.trim();
  const codename = raw ? raw : null;
  return { version, build, codename };
}
