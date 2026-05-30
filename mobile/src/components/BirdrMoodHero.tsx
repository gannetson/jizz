import React from 'react';
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  StyleSheet,
  Animated,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BIRDR_MOOD_IMAGES, type BirdrMood } from '../constants/birdrMoodImages';
import { usePulsatingAnimation } from '../hooks/usePulsatingAnimation';
import { colors } from '../theme';

type Props = {
  mood: BirdrMood;
  title?: string;
  subtitle?: string;
  showSpinner?: boolean;
  pulse?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

export function BirdrMoodHero({
  mood,
  title,
  subtitle,
  showSpinner = false,
  pulse = false,
  testID,
  style,
}: Props) {
  const pulseStyle = usePulsatingAnimation(!!pulse);
  const image = (
    <Image
      source={BIRDR_MOOD_IMAGES[mood]}
      style={styles.image}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );

  return (
    <View style={[styles.wrap, style]} testID={testID}>
      {pulse ? <Animated.View style={pulseStyle}>{image}</Animated.View> : image}
      {showSpinner ? (
        <ActivityIndicator size="large" color={colors.primary[500]} style={styles.spinner} />
      ) : null}
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  image: {
    width: 220,
    height: 220,
  },
  spinner: {
    marginTop: 16,
    marginBottom: 8,
  },
  title: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary[800],
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: colors.primary[600],
    textAlign: 'center',
    lineHeight: 22,
  },
});
