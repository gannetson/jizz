import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useProfile } from '../context/ProfileContext';
import {
  getStoredBirdrJourneyCountryCode,
  isCountryChallengeRoute,
  resolveCountryChallengeRoute,
} from '../api/birdrJourney';
import { colors } from '../theme';
import { getAppVersionDisplay } from '../utils/appVersion';

const MENU_ITEMS: { route: string; label: string }[] = [
  { route: 'Home', label: 'Home' },
  { route: 'Start', label: 'New game' },
  { route: 'Scores', label: 'High scores' },
  { route: 'BirdrJourneyIntro', label: 'Country challenge' },
  { route: 'Updates', label: 'Updates' },
  { route: 'Help', label: 'Help' },
  { route: 'Privacy', label: 'Privacy' },
  { route: 'About', label: 'About Birdr' },
];

export function LeftDrawerContent(props: DrawerContentComponentProps) {
  const { state, navigation } = props;
  const { profile, ready: profileReady } = useProfile();
  const { version: appVersion, build: buildNumber, codename } = getAppVersionDisplay();
  const versionLine = (() => {
    const base = buildNumber ? `${appVersion} (${buildNumber})` : appVersion;
    return codename ? `${base} · ${codename}` : base;
  })();

  const openCountryChallenge = useCallback(async () => {
    const storedCountry = await getStoredBirdrJourneyCountryCode();
    const target = await resolveCountryChallengeRoute([
      storedCountry,
      profileReady ? profile?.country_code : null,
    ]);
    if (target.name === 'BirdrJourneyProgress') {
      navigation.navigate(target.name, target.params);
    } else {
      navigation.navigate(target.name);
    }
    navigation.closeDrawer();
  }, [navigation, profile?.country_code, profileReady]);

  return (
    <View style={styles.container}>
      <View style={styles.menuHeader}>
        <Text style={styles.menuHeaderTitle}>Birdr</Text>
        <Text style={styles.menuHeaderVersion}>Version {versionLine}</Text>
      </View>
      <View style={styles.footerSpacer}>
        {MENU_ITEMS.map((item) => {
          const currentRoute = state.routes[state.index]?.name;
          const isHelpDetail =
            currentRoute === 'HelpDetail' &&
            (state.routes[state.index].params as { slug?: string } | undefined)?.slug;
          const focused =
            (item.route === 'BirdrJourneyIntro'
              ? isCountryChallengeRoute(currentRoute)
              : currentRoute === item.route) ||
            (item.route === 'Privacy' && isHelpDetail === 'privacy') ||
            (item.route === 'About' && isHelpDetail === 'about');
          return (
            <TouchableOpacity
              key={item.route}
              style={[styles.item, focused && styles.itemFocused]}
              onPress={() => {
                if (item.route === 'BirdrJourneyIntro') {
                  void openCountryChallenge();
                  return;
                }
                if (item.route === 'Privacy') {
                  navigation.navigate('HelpDetail', { slug: 'privacy' });
                } else if (item.route === 'About') {
                  navigation.navigate('HelpDetail', { slug: 'about' });
                } else {
                  navigation.navigate(item.route);
                }
                navigation.closeDrawer();
              }}
            >
              <Text style={[styles.label, focused && styles.labelFocused]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Data: eBird</Text>
        <Text style={styles.footerText}>Media: iNaturalist, Wikimedia, GBIF, EOL, Observation.org, Xeno-Canto</Text>
        <Text style={styles.footerText}>Developed by GoedLoek</Text>
        <Text style={styles.footerText}>Contact: info@goedloek.nl</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  menuHeader: {
    marginBottom: 12,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.primary[200],
  },
  menuHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary[800],
    marginBottom: 6,
  },
  menuHeaderVersion: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[600],
  },
  item: {
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  itemFocused: {
    backgroundColor: colors.primary[100],
    borderRadius: 8,
  },
  label: {
    fontSize: 18,
    color: colors.primary[800],
  },
  labelFocused: {
    fontWeight: '600',
  },
  footerSpacer: {
    flex: 1,
  },
  footer: {
    paddingVertical: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.primary[200],
  },
  footerText: {
    fontSize: 12,
    color: colors.primary[600],
    marginBottom: 4,
  },
});
