import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { colors } from '../theme';

type MediaWithCredits = {
  contributor?: string | null;
  source?: string | null;
  link?: string | null;
};

type Props = {
  media?: MediaWithCredits | null;
  fontSize?: number;
  onPress?: () => void;
};

export function MediaCredits({ media, fontSize = 13, onPress }: Props) {
  if (!media) return null;
  const { contributor, source, link } = media;
  if (!contributor && !link) return null;

  const handleOpenLink = () => {
    if (link) {
      Linking.openURL(link).catch(() => {});
    }
    onPress?.();
  };

  if (!contributor && link) {
    return (
      <View style={styles.wrap}>
        <TouchableOpacity onPress={handleOpenLink}>
          <Text style={[styles.text, styles.link, { fontSize }]}>{source || 'Source'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.text, { fontSize }]}>{contributor}</Text>
      {link ? (
        <>
          <Text style={[styles.text, { fontSize }]}> / </Text>
          <TouchableOpacity onPress={handleOpenLink}>
            <Text style={[styles.text, styles.link, { fontSize }]}>{source || 'Source'}</Text>
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 8 },
  text: { color: colors.primary[600] },
  link: { color: colors.primary[600], textDecorationLine: 'underline' },
});
