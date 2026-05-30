import { ImageSourcePropType } from 'react-native';

export type BirdrMood = 'waiting' | 'success' | 'failed' | 'stressed';

export const BIRDR_MOOD_IMAGES: Record<BirdrMood, ImageSourcePropType> = {
  waiting: require('../../assets/birdr-waiting.png'),
  success: require('../../assets/birdr-success.png'),
  failed: require('../../assets/birdr-failed.png'),
  stressed: require('../../assets/birdr-stressed.png'),
};
