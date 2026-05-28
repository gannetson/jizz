import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigateToDailyChallenge(): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate('DailyChallenge' as never);
  }
}
