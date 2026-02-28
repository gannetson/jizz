import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

type Props = {
  rating: number;
  onRating: (value: number) => void;
  count?: number;
  size?: number;
};

export function StarRating({ rating, onRating, count = 5, size = 24 }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }, (_, i) => {
        const value = i + 1;
        const filled = value <= rating;
        return (
          <TouchableOpacity
            key={value}
            onPress={() => onRating(value)}
            style={styles.star}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.starChar, { fontSize: size, color: filled ? colors.primary[500] : colors.primary[200] }]}>
              ★
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  star: { padding: 4 },
  starChar: { includeFontPadding: false },
});
