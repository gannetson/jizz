import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, Linking, ActivityIndicator, Image } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useTranslation } from '../i18n/TranslationContext';
import { getCountryDisplayName } from '../i18n/countryNames';
import { loadUpdates, UpdateListItem } from '../api/updates';
import { UpdateListItemCard } from '../components/UpdateListItemCard';
import {
  findInProgressBirdrJourney,
  getStoredBirdrJourneyCountryCode,
  type BirdrJourney,
  type JourneyLevel,
} from '../api/birdrJourney';
import { fetchChecklist, type ChecklistProgress } from '../api/checklist';
import { BirdrLevelImage } from '../components/BirdrLevelImage';
import { ProgressRing } from '../components/ProgressRing';
import { colors } from '../theme';
import { APP_STORE_URL, PLAY_STORE_URL } from '../constants/storeUrls';
import { BIRDR_MOOD_IMAGES } from '../constants/birdrMoodImages';
import { FeedbackForm } from '../components/FeedbackForm';

function openStoreReview() {
  if (Platform.OS === 'android') {
    Linking.openURL(PLAY_STORE_URL);
    return;
  }
  Linking.openURL(`${APP_STORE_URL}?action=write-review`);
}

function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return '';
  const base = 0x1f1e6;
  const c1 = code.charCodeAt(0) - 65;
  const c2 = code.charCodeAt(1) - 65;
  if (c1 < 0 || c1 > 25 || c2 < 0 || c2 > 25) return code;
  return String.fromCodePoint(base + c1, base + c2);
}

function levelTitle(level: JourneyLevel | null | undefined, locale: string): string {
  if (!level) return '';
  if (locale === 'nl' && level.title_nl?.trim()) return level.title_nl;
  return level.title;
}

type ChecklistSummary = {
  countryCode: string;
  countryName: string;
  progress: ChecklistProgress;
};

type RootStackParamList = {
  Home: undefined;
  Start: undefined;
  Scores: undefined;
  BirdrJourneyIntro: undefined;
  BirdrJourneyProgress: { countryCode: string };
  Updates: undefined;
  UpdateDetail: { updateId: number };
  Help: undefined;
  Login: undefined;
};

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Home'>>();
  const { t, locale } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { profile, ready: profileReady } = useProfile();
  const [updates, setUpdates] = useState<UpdateListItem[]>([]);
  const [activeJourney, setActiveJourney] = useState<BirdrJourney | null>(null);
  const [journeyLoading, setJourneyLoading] = useState(true);
  const [checklistSummary, setChecklistSummary] = useState<ChecklistSummary | null>(null);
  const [checklistLoading, setChecklistLoading] = useState(false);

  const loadChecklistSummary = useCallback(async () => {
    if (!isAuthenticated || !profileReady) {
      setChecklistSummary(null);
      return;
    }
    const code = profile?.country_code?.trim();
    if (!code) {
      setChecklistSummary(null);
      return;
    }
    setChecklistLoading(true);
    try {
      const data = await fetchChecklist({
        country_code: code,
        page_size: 1,
        page: 1,
        language: locale,
      });
      setChecklistSummary({
        countryCode: data.country.code,
        countryName: getCountryDisplayName(data.country, locale),
        progress: data.progress,
      });
    } catch {
      setChecklistSummary(null);
    } finally {
      setChecklistLoading(false);
    }
  }, [isAuthenticated, profileReady, profile?.country_code, locale]);

  const loadActiveJourney = useCallback(async () => {
    setJourneyLoading(true);
    try {
      const storedCountry = await getStoredBirdrJourneyCountryCode();
      const journey = await findInProgressBirdrJourney([
        storedCountry,
        isAuthenticated && profileReady && profile?.country_code ? profile.country_code : null,
      ]);
      setActiveJourney(journey);
    } catch {
      setActiveJourney(null);
    } finally {
      setJourneyLoading(false);
    }
  }, [profile?.country_code, profileReady, isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      loadUpdates().then(setUpdates).catch(() => {});
      loadActiveJourney();
      loadChecklistSummary();
    }, [loadActiveJourney, loadChecklistSummary])
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setActiveJourney(null);
      setChecklistSummary(null);
    }
    if (profileReady || !isAuthenticated) {
      loadActiveJourney();
    }
    if (isAuthenticated && profileReady) {
      loadChecklistSummary();
    }
  }, [isAuthenticated, profileReady, profile?.country_code, loadActiveJourney, loadChecklistSummary]);

  const goJourneyProgress = () => {
    if (!activeJourney?.country?.code) return;
    navigation.navigate('BirdrJourneyProgress', { countryCode: activeJourney.country.code });
  };

  const countryCode = activeJourney?.country?.code ?? '';
  const countryLabel = activeJourney?.country
    ? getCountryDisplayName(activeJourney.country, locale)
    : '';
  const flag = countryCodeToFlag(countryCode);
  const currentLevelTitle = levelTitle(activeJourney?.current_level, locale);
  const checklistPercent = Math.round(checklistSummary?.progress.percent ?? 0);
  const checklistCountryFlag = countryCodeToFlag(checklistSummary?.countryCode ?? '');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.welcome}>{t('welcome')}</Text>
      {!isAuthenticated && (
        <View style={styles.signUpSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.primaryButtonText}>{t('sign_up')}</Text>
          </TouchableOpacity>
          <Text style={styles.signUpSubtext}>{t('sign_up_track_progress')}</Text>
        </View>
      )}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('Start')}
        testID="home.startNewGame"
        accessibilityLabel={t('start_new_game')}
      >
        <Text style={styles.primaryButtonText}>{t('start_new_game')}</Text>
      </TouchableOpacity>

      {journeyLoading ? (
        <View style={styles.journeyLoadingWrap}>
          <ActivityIndicator size="small" color={colors.primary[500]} />
        </View>
      ) : activeJourney ? (
        <TouchableOpacity
          style={styles.journeyHeroButton}
          onPress={goJourneyProgress}
          testID="home.birdrJourneyContinue"
          accessibilityLabel={`${t('country_challenge')}, ${currentLevelTitle}, ${countryLabel}`}
        >
          <BirdrLevelImage
            iconUrl={activeJourney.current_level?.icon_url}
            variant="current"
            size={88}
          />
          <View style={styles.journeyHeroText}>
            <Text style={styles.journeyHeroLevel} numberOfLines={2}>
              {currentLevelTitle || t('country_challenge')}
            </Text>
            <Text style={styles.journeyHeroCountry} numberOfLines={1}>
              {flag ? `${flag} ` : ''}{countryLabel}
            </Text>
            <Text style={styles.journeyHeroHint}>{t('continue')}</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.journeyHeroButton}
          onPress={() => navigation.navigate('BirdrJourneyIntro')}
          testID="home.birdrJourney"
          accessibilityLabel={`${t('country_challenge')}, ${t('country_challenge_new_improved')}`}
        >
          <Image source={BIRDR_MOOD_IMAGES.success} style={styles.journeyNewHeroImage} resizeMode="contain" />
          <View style={styles.journeyHeroText}>
            <Text style={styles.journeyHeroLevel} numberOfLines={2}>
              {t('country_challenge')}
            </Text>
            <Text style={styles.journeyHeroHint}>{t('country_challenge_new_improved')}</Text>
          </View>
        </TouchableOpacity>
      )}

      {isAuthenticated && (
        checklistLoading && !checklistSummary ? (
          <View style={styles.checklistLoadingWrap}>
            <ActivityIndicator size="small" color={colors.primary[500]} />
          </View>
        ) : (
          <TouchableOpacity
            style={styles.checklistHeroButton}
            onPress={() => navigation.navigate('Checklist' as never)}
            testID="home.checklist"
            accessibilityLabel={
              checklistSummary
                ? `${t('checklist_title')}, ${checklistSummary.countryName}, ${checklistPercent}%`
                : t('checklist_title')
            }
          >
            {checklistSummary ? (
              <>
                <View style={styles.checklistRingWrap}>
                  <ProgressRing
                    percent={checklistSummary.progress.percent}
                    size={80}
                    stroke={12}
                    trackColor={colors.primary[500]}
                    progressColor={colors.primary[100]}
                  />
                  <Text style={styles.checklistRingPercent}>{checklistPercent}%</Text>
                </View>
                <View style={styles.checklistHeroText}>
                  <Text style={styles.checklistHeroTitle}>{t('checklist_title')}</Text>
                  <Text style={styles.checklistHeroCountry} numberOfLines={1}>
                    {checklistCountryFlag ? `${checklistCountryFlag} ` : ''}
                    {checklistSummary.countryName}
                  </Text>
                  <Text style={styles.checklistHeroProgress}>
                    {t('checklist_progress', '{identified} / {total} birds identified')
                      .replace('{identified}', String(checklistSummary.progress.identified_count))
                      .replace('{total}', String(checklistSummary.progress.total_count))}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.checklistHeroTextOnly}>
                <Text style={styles.checklistHeroTitle}>{t('checklist_title')}</Text>
                <Text style={styles.checklistHeroHint}>
                  {profile?.country_code
                    ? t('failed_load')
                    : t('checklist_set_country')}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )
      )}
      <FeedbackForm />
      {updates.length > 0 && (
        <UpdateListItemCard
          update={updates[0]}
          readMoreLabel={t('read_more')}
          style={styles.homeUpdateCard}
          onPress={() => navigation.navigate('UpdateDetail', { updateId: updates[0].id })}
        />
      )}
      <TouchableOpacity
        style={styles.ghostButton}
        onPress={() => navigation.navigate('Updates')}
      >
        <Text style={styles.ghostButtonText}>{t('more_updates')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
    paddingTop: 16,
  },
  welcome: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.primary[800],
    marginBottom: 24,
  },
  signUpSection: {
    marginBottom: 24,
  },
  signUpSubtext: {
    fontSize: 14,
    color: colors.primary[600],
    textAlign: 'center',
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: colors.primary[50],
    fontSize: 16,
    fontWeight: '600',
  },
  journeyLoadingWrap: {
    paddingVertical: 28,
    alignItems: 'center',
    marginBottom: 12,
  },
  journeyHeroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.primary[800],
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.primary[400],
  },
  journeyHeroText: {
    flex: 1,
    minWidth: 0,
  },
  journeyHeroCountry: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary[100],
    marginBottom: 4,
  },
  journeyHeroLevel: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary[50],
    lineHeight: 28,
    marginBottom: 4,
  },
  journeyHeroHint: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[300],
  },
  journeyNewHeroImage: {
    width: 88,
    height: 88,
  },
  checklistLoadingWrap: {
    paddingVertical: 28,
    alignItems: 'center',
    marginBottom: 12,
  },
  checklistHeroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.primary[600],
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.primary[400],
  },
  checklistRingWrap: {
    width: 88,
    height: 88,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checklistRingPercent: {
    position: 'absolute',
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary[50],
  },
  checklistHeroText: {
    flex: 1,
    minWidth: 0,
  },
  checklistHeroTextOnly: {
    flex: 1,
  },
  checklistHeroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary[50],
    marginBottom: 4,
  },
  checklistHeroCountry: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary[100],
    marginBottom: 4,
  },
  checklistHeroProgress: {
    fontSize: 14,
    color: colors.primary[200],
    lineHeight: 20,
  },
  checklistHeroHint: {
    fontSize: 14,
    color: colors.primary[100],
    lineHeight: 20,
  },
  ghostButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  ghostButtonText: {
    color: colors.primary[500],
    fontSize: 16,
  },
  homeUpdateCard: {
    marginVertical: 12,
    marginBottom: 4,
  },
});
