import { ImageSourcePropType } from 'react-native';
import type { VisualStyle } from '../lib/visualStyle';

export const MAX_BIRDR_LEVEL = 7;

const CLASSIC: Record<number, ImageSourcePropType> = {
  0: require('../../assets/birdr-level0.png'),
  1: require('../../assets/birdr-level1.png'),
  2: require('../../assets/birdr-level2.png'),
  3: require('../../assets/birdr-level3.png'),
  4: require('../../assets/birdr-level4.png'),
  5: require('../../assets/birdr-level5.png'),
  6: require('../../assets/birdr-level6.png'),
  7: require('../../assets/birdr-level7.png'),
};

const STYLISH: Record<number, ImageSourcePropType> = {
  0: require('../../assets/stylish/birdr-level0.png'),
  1: require('../../assets/stylish/birdr-level1.png'),
  2: require('../../assets/stylish/birdr-level2.png'),
  3: require('../../assets/stylish/birdr-level3.png'),
  4: require('../../assets/stylish/birdr-level4.png'),
  5: require('../../assets/stylish/birdr-level5.png'),
  6: require('../../assets/stylish/birdr-level6.png'),
  7: require('../../assets/stylish/birdr-level7.png'),
};

export const LEVEL_ASSETS = CLASSIC;

export function getLevelAsset(sequence: number, style: VisualStyle = 'classic'): ImageSourcePropType {
  const clamped = Math.max(0, Math.min(MAX_BIRDR_LEVEL, sequence));
  return (style === 'stylish' ? STYLISH : CLASSIC)[clamped];
}
