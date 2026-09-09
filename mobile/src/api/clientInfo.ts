import { Platform } from 'react-native';
import { getAppVersionDisplay } from '../utils/appVersion';

export type DeviceType = 'ios' | 'android' | 'web';

export function getDeviceType(): DeviceType {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

export function getAppVersion(): string {
  const version = getAppVersionDisplay().version;
  return version && version !== '—' ? version : '';
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
