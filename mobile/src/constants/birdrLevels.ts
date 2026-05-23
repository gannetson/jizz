import { ImageSourcePropType } from 'react-native';

export const MAX_BIRDR_LEVEL = 7;

export const LEVEL_ASSETS: Record<number, ImageSourcePropType> = {
  0: require('../../assets/birdr-level0.png'),
  1: require('../../assets/birdr-level1.png'),
  2: require('../../assets/birdr-level2.png'),
  3: require('../../assets/birdr-level3.png'),
  4: require('../../assets/birdr-level4.png'),
  5: require('../../assets/birdr-level5.png'),
  6: require('../../assets/birdr-level6.png'),
  7: require('../../assets/birdr-level7.png'),
};

export function getLevelAsset(sequence: number): ImageSourcePropType {
  const clamped = Math.max(0, Math.min(MAX_BIRDR_LEVEL, sequence));
  return LEVEL_ASSETS[clamped];
}
