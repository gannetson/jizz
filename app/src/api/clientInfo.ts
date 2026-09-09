import packageJson from '../../package.json';

export type DeviceType = 'ios' | 'android' | 'web';

export function getDeviceType(): DeviceType {
  if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
    const platform = window.Capacitor.getPlatform?.();
    if (platform === 'ios' || platform === 'android') return platform;
  }
  return 'web';
}

export function getAppVersion(): string {
  return (packageJson as { version?: string }).version || '';
}

export function clientInfoPayload(): { app_version?: string; device_type: DeviceType } {
  const app_version = getAppVersion();
  const payload: { app_version?: string; device_type: DeviceType } = {
    device_type: getDeviceType(),
  };
  if (app_version) payload.app_version = app_version;
  return payload;
}

export function clientInfoHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Birdr-Device-Type': getDeviceType(),
  };
  const app_version = getAppVersion();
  if (app_version) headers['X-Birdr-App-Version'] = app_version;
  return headers;
}
