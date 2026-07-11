import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { SpeciesCoverThumb } from './SpeciesCoverThumb';
import { colors } from '../theme';

export function ebirdSpeciesUrl(code: string | null | undefined): string | null {
  const trimmed = code?.trim();
  return trimmed ? `https://ebird.org/species/${trimmed}` : null;
}

export function botwSpeciesUrl(code: string | null | undefined): string | null {
  const trimmed = code?.trim();
  return trimmed ? `https://birdsoftheworld.org/bow/species/${trimmed}/cur/introduction` : null;
}

type Props = {
  speciesId: number;
  name: string;
  code?: string | null;
  illustrationUrl?: string | null;
};

export function PracticeSpeciesLinks({
  speciesId,
  name,
  code,
  illustrationUrl,
}: Props) {
  const ebirdUrl = ebirdSpeciesUrl(code);
  const botwUrl = botwSpeciesUrl(code);

  if (!ebirdUrl && !botwUrl) return null;

  return (
    <View style={styles.row}>
      <SpeciesCoverThumb
        speciesId={speciesId}
        initialUrl={illustrationUrl}
        size={72}
        alt={name}
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        <View style={styles.links}>
          {ebirdUrl ? (
            <TouchableOpacity onPress={() => Linking.openURL(ebirdUrl)} accessibilityRole="link">
              <Text style={styles.linkText}>eBird</Text>
            </TouchableOpacity>
          ) : null}
          {botwUrl ? (
            <TouchableOpacity onPress={() => Linking.openURL(botwUrl)} accessibilityRole="link">
              <Text style={styles.linkText}>Birds of the World</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    width: '100%',
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary[800],
    lineHeight: 20,
  },
  links: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[600],
  },
});
