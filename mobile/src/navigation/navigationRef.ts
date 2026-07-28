import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigateToDailyChallenge(): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate('DailyChallenge' as never);
  }
}

export function navigateToFlockDetail(slug: string): void {
  if (navigationRef.isReady() && slug) {
    navigationRef.navigate('FlockDetail' as never, { slug } as never);
  }
}
