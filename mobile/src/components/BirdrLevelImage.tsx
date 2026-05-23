import React from 'react';
import { View, Image, StyleSheet, ImageStyle, StyleProp } from 'react-native';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { getLevelAsset } from '../constants/birdrLevels';
import { colors } from '../theme';

export type BirdrLevelImageVariant = 'current' | 'next' | 'locked' | 'completed';

type Props = {
  sequence: number;
  variant: BirdrLevelImageVariant;
  size?: number;
  style?: StyleProp<ImageStyle>;
};

const SIZE_BY_VARIANT: Record<BirdrLevelImageVariant, number> = {
  current: 180,
  next: 110,
  locked: 72,
  completed: 88,
};

export function BirdrLevelImage({ sequence, variant, size, style }: Props) {
  const dimension = size ?? SIZE_BY_VARIANT[variant];
  const source = getLevelAsset(sequence);
  const isSilhouette = variant === 'next' || variant === 'locked';
  const isCompleted = variant === 'completed';

  return (
    <View
      style={[
        styles.frame,
        { width: dimension, height: dimension, borderRadius: dimension * 0.12 },
        variant === 'current' && styles.frameCurrent,
      ]}
    >
      <Image
        source={source}
        style={[
          styles.image,
          { width: dimension, height: dimension },
          isSilhouette && styles.silhouette,
          isCompleted && styles.completed,
          style,
        ]}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      {isSilhouette && <View style={[styles.overlay, { borderRadius: dimension * 0.12 }]} />}
      {variant === 'locked' && (
        <View style={styles.lockBadge}>
          <FontAwesome5 name="lock" size={14} color={colors.primary[50]} />
        </View>
      )}
      {isCompleted && (
        <View style={styles.checkBadge}>
          <FontAwesome5 name="check" size={12} color={colors.primary[50]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.primary[900],
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameCurrent: {
    borderWidth: 3,
    borderColor: colors.primary[400],
  },
  image: {
    backgroundColor: 'transparent',
  },
  silhouette: {
    opacity: 0.45,
  },
  completed: {
    opacity: 0.75,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  lockBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: colors.primary[700],
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: colors.success[500],
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
