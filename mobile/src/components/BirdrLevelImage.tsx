import React from 'react';
import { View, Image, StyleSheet, ImageStyle, StyleProp } from 'react-native';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { colors } from '../theme';
import { resolveMediaUrl } from '../api/config';

export type BirdrLevelImageVariant = 'current' | 'next' | 'locked' | 'completed' | 'plain';

type Props = {
  iconUrl?: string | null;
  variant: BirdrLevelImageVariant;
  size?: number;
  style?: StyleProp<ImageStyle>;
};

const SIZE_BY_VARIANT: Record<BirdrLevelImageVariant, number> = {
  current: 180,
  next: 110,
  locked: 72,
  completed: 88,
  plain: 88,
};

export function BirdrLevelImage({ iconUrl, variant, size, style }: Props) {
  const dimension = size ?? SIZE_BY_VARIANT[variant];
  const isSilhouette = variant === 'next' || variant === 'locked';
  const isCompleted = variant === 'completed';
  const resolvedUrl = resolveMediaUrl(iconUrl);

  return (
    <View
      style={[
        styles.frame,
        { width: dimension, height: dimension, borderRadius: dimension * 0.12 },
        variant === 'current' && styles.frameCurrent,
      ]}
    >
      {resolvedUrl ? (
        <Image
          source={{ uri: resolvedUrl }}
          style={[
            styles.image,
            { width: dimension, height: dimension },
            isSilhouette && styles.silhouette,
            isCompleted && styles.completed,
            style,
          ]}
          blurRadius={isSilhouette ? 8 : 0}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={[styles.placeholder, { width: dimension, height: dimension }]} />
      )}
      {isSilhouette && resolvedUrl && <View style={[styles.overlay, { borderRadius: dimension * 0.12 }]} />}
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
    backgroundColor: colors.primary[100],
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
  placeholder: {
    backgroundColor: colors.primary[700],
  },
  silhouette: {
    backgroundColor: colors.primary[900],
    opacity: 0.8
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
