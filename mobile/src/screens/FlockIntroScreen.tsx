import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/TranslationContext';
import { colors } from '../theme';
import { getFlockImage } from '../constants/birdrFlockImages';
import { GameArtImage } from '../components/GameArtImage';
import { useVisualStyle } from '../context/VisualStyleContext';

type NavParams = {
  FlockIntro: undefined;
  FlockCreate: undefined;
  FlockJoin: undefined;
  Login: undefined;
};

export function FlockIntroScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<NavParams>>();
  const { t } = useTranslation();
  const { visualStyle } = useVisualStyle();
  const { isAuthenticated } = useAuth();

  const requireAuth = (then: () => void) => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }
    then();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroBand}>
        <GameArtImage source={getFlockImage('invite', visualStyle)} style={styles.heroImage} resizeMode="contain" />
        <Text style={styles.heroTitle}>{t('flocks_intro_title')}</Text>
        <Text style={styles.heroBody}>{t('flocks_intro_body')}</Text>
      </View>

      <View style={styles.steps}>
        <Step number={1} text={t('flocks_intro_step_create')} />
        <Step number={2} text={t('flocks_intro_step_invite')} />
        <Step number={3} text={t('flocks_intro_step_compete')} />
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => requireAuth(() => navigation.navigate('FlockCreate'))}
        testID="flocks.intro.cta"
      >
        <Text style={styles.primaryButtonText}>{t('flocks_intro_cta')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.ghostButton}
        onPress={() => requireAuth(() => navigation.navigate('FlockJoin'))}
        testID="flocks.intro.join"
      >
        <Text style={styles.ghostButtonText}>{t('flocks_intro_join_instead')}</Text>
      </TouchableOpacity>
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
  heroImage: {
    width: '100%',
    maxWidth: 320,
    height: 214,
    marginBottom: 12,
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
    fontSize: 15,
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
  ghostButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  ghostButtonText: {
    color: colors.primary[500],
    fontSize: 16,
  },
});
