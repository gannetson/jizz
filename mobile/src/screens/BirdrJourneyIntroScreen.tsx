import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/TranslationContext';
import { colors } from '../theme';
import { getLevelAsset } from '../constants/birdrLevels';

type NavParams = {
  BirdrJourneyIntro: undefined;
  BirdrJourneyCountry: undefined;
  Login: undefined;
};

export function BirdrJourneyIntroScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavParams>>();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  const goCountry = () => navigation.navigate('BirdrJourneyCountry');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroBand}>
        <View style={styles.heroImageWrap}>
          <Image source={getLevelAsset(0)} style={styles.heroImage} resizeMode="contain" />
        </View>
        <Text style={styles.heroTitle}>{t('birdr_journey_intro_title')}</Text>
        <Text style={styles.heroBody}>{t('birdr_journey_intro_body')}</Text>
      </View>

      <View style={styles.steps}>
        <Step number={1} text={t('birdr_journey_step_country')} />
        <Step number={2} text={t('birdr_journey_step_daily')} />
        <Step number={3} text={t('birdr_journey_step_hatch')} />
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={goCountry} testID="journey.intro.cta">
        <Text style={styles.primaryButtonText}>{t('birdr_journey_select_country')}</Text>
      </TouchableOpacity>

      {!isAuthenticated && (
        <>
          <TouchableOpacity style={styles.secondaryButton} onPress={goCountry}>
            <Text style={styles.secondaryButtonText}>{t('birdr_journey_continue_guest')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ghostButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.ghostButtonText}>{t('sign_up_track_progress')}</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

function Step({ number, text }: { number: number; text: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{number}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary[50],
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  heroBand: {
    backgroundColor: colors.primary[800],
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  heroImageWrap: {
    width: 200,
    height: 200,
    marginBottom: 12,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary[50],
    textAlign: 'center',
    marginBottom: 10,
  },
  heroBody: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.primary[100],
    textAlign: 'center',
  },
  steps: {
    marginBottom: 28,
    gap: 14,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    color: colors.primary[50],
    fontWeight: '700',
    fontSize: 16,
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    color: colors.primary[800],
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: colors.primary[50],
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.primary[200],
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  secondaryButtonText: {
    color: colors.primary[800],
    fontSize: 16,
    fontWeight: '600',
  },
  ghostButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  ghostButtonText: {
    color: colors.primary[500],
    fontSize: 15,
  },
});
