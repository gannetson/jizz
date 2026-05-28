import { Alert, Linking, Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { getAccessToken } from '../api/auth';
import { registerPushWithBackend } from '../api/pushRegister';
import { navigateToDailyChallenge } from '../navigation/navigationRef';

const WELCOME_TITLE = 'Birdr';
const WELCOME_BODY = "You're good to go!";
const ANDROID_CHANNEL_ID = 'default';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type PushOnboardingResult =
  | 'granted_registered'
  | 'granted_local_only'
  | 'granted_no_token'
  | 'denied'
  | 'denied_can_open_settings';

function getExpoProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Birdr',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2D5A3D',
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
  });
}

function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

async function requestNotificationPermission(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === Notifications.PermissionStatus.GRANTED) {
    return { granted: true, canAskAgain: true };
  }
  if (
    existing.status === Notifications.PermissionStatus.DENIED &&
    existing.canAskAgain === false
  ) {
    return { granted: false, canAskAgain: false };
  }
  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return {
    granted: requested.status === Notifications.PermissionStatus.GRANTED,
    canAskAgain: requested.canAskAgain !== false,
  };
}

/** Show welcome banner immediately (works in foreground + background). */
async function showLocalWelcomeNotification(): Promise<void> {
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: WELCOME_TITLE,
      body: WELCOME_BODY,
      data: { type: 'signup_test' },
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
    },
    trigger: null,
  });
}

async function registerTokenWithBackend(expoPushToken: string): Promise<{
  ok: boolean;
  testPushSent?: boolean;
  error?: string;
}> {
  const access = await getAccessToken();
  if (!access) {
    return { ok: false, error: 'not_logged_in' };
  }
  try {
    const result = await registerPushWithBackend({
      expo_push_token: expoPushToken,
      timezone: getDeviceTimezone(),
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
    return { ok: true, testPushSent: result.test_push_sent };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'registration_failed';
    if (__DEV__) {
      console.warn('[push] backend registration failed', msg);
    }
    return { ok: false, error: msg };
  }
}

function maybeShowDevPushAlert(result: PushOnboardingResult, detail?: string): void {
  if (!__DEV__) return;
  Alert.alert('Push onboarding (dev)', `${result}${detail ? `\n${detail}` : ''}`);
}

/**
 * Ask for push permission and register with the API when logged in.
 * Always shows a local welcome notification when permission is granted.
 */
export async function registerForPushNotificationsAsync(): Promise<PushOnboardingResult> {
  try {
    await ensureAndroidChannel();

    const { granted, canAskAgain } = await requestNotificationPermission();
    if (!granted) {
      const result = canAskAgain ? 'denied' : 'denied_can_open_settings';
      maybeShowDevPushAlert(result);
      return result;
    }

    // Always show something on-device (server push may be off or app in foreground).
    await showLocalWelcomeNotification();

    if (!Device.isDevice) {
      maybeShowDevPushAlert('granted_local_only', 'simulator');
      return 'granted_local_only';
    }

    const projectId = getExpoProjectId();
    let expoPushToken: string | undefined;
    try {
      const tokenResponse = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      expoPushToken = tokenResponse.data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      maybeShowDevPushAlert('granted_no_token', msg);
      return 'granted_no_token';
    }

    if (!expoPushToken) {
      maybeShowDevPushAlert('granted_no_token');
      return 'granted_no_token';
    }

    const backend = await registerTokenWithBackend(expoPushToken);
    if (backend.ok) {
      const detail = backend.testPushSent
        ? 'server test push sent'
        : 'server test push not sent (check SEND_PUSH_NOTIFICATIONS)';
      maybeShowDevPushAlert('granted_registered', detail);
      return 'granted_registered';
    }

    maybeShowDevPushAlert(
      'granted_local_only',
      backend.error === 'not_logged_in'
        ? 'guest — sign in for server pushes'
        : backend.error
    );
    return 'granted_local_only';
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (__DEV__) {
      console.warn('[push] registerForPushNotificationsAsync failed', msg);
      Alert.alert('Push onboarding failed', msg);
    }
    return 'denied';
  }
}

/** Call when the user starts Birdr Journey (after country is chosen). */
export async function runBirdrJourneyPushOnboarding(): Promise<void> {
  const result = await registerForPushNotificationsAsync();
  if (result === 'denied_can_open_settings') {
    Alert.alert(
      'Notifications',
      'Notifications are turned off for Birdr. Enable them in system settings to get daily challenge reminders.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open settings', onPress: () => Linking.openSettings() },
      ]
    );
  }
}

export function setupNotificationResponseHandler(): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as { type?: string };
    if (data?.type === 'signup_test' || data?.type === 'daily_challenge') {
      navigateToDailyChallenge();
    }
  });
  return () => sub.remove();
}
