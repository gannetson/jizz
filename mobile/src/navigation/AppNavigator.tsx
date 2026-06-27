import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
import { useTranslation } from '../i18n/TranslationContext';
import { UserMenuModal } from '../components/UserMenuModal';
import { LeftMenuModal } from '../components/LeftMenuModal';
import { HomeScreen } from '../screens/HomeScreen';
import { UpdatesScreen } from '../screens/UpdatesScreen';
import { HelpOverviewScreen } from '../screens/HelpScreen';
import { HelpDetailScreenWrapper } from '../screens/HelpDetailScreen';
import { StartScreen } from '../screens/StartScreen';
import { ScoresScreen } from '../screens/ScoresScreen';
import { LobbyScreen } from '../screens/LobbyScreen';
import { GamePlayScreen } from '../screens/GamePlayScreen';
import { GameResultsScreen } from '../screens/GameResultsScreen';
import { MediaReviewScreen } from '../screens/MediaReviewScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { MyGamesScreen } from '../screens/MyGamesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ChallengePlayScreen } from '../screens/ChallengePlayScreen';
import { GameDetailScreen } from '../screens/GameDetailScreen';
import { DailyChallengeListScreen } from '../screens/DailyChallengeListScreen';
import { DailyChallengeDetailScreen } from '../screens/DailyChallengeDetailScreen';
import { DailyChallengeCreateScreen } from '../screens/DailyChallengeCreateScreen';
import { BirdrJourneyIntroScreen } from '../screens/BirdrJourneyIntroScreen';
import { BirdrJourneyListScreen } from '../screens/BirdrJourneyListScreen';
import { BirdrJourneyCountryScreen } from '../screens/BirdrJourneyCountryScreen';
import { BirdrJourneyProgressScreen } from '../screens/BirdrJourneyProgressScreen';
import { BirdrJourneyStepIntroScreen } from '../screens/BirdrJourneyStepIntroScreen';
import { BirdrJourneyStepResultsScreen } from '../screens/BirdrJourneyStepResultsScreen';
import { BirdrJourneyLevelCelebrationScreen } from '../screens/BirdrJourneyLevelCelebrationScreen';
import { CountryChallengeLeaderboardScreen } from '../screens/CountryChallengeLeaderboardScreen';
import { ChecklistScreen } from '../screens/ChecklistScreen';
import { TroubleSpotsScreen } from '../screens/TroubleSpotsScreen';
import { UpdateDetailScreen } from '../screens/UpdateDetailScreen';

const Stack = createNativeStackNavigator();

const SCREENS: { name: string; titleKey: string; component: React.ComponentType<any> }[] = [
  { name: 'Home', titleKey: 'app_name', component: HomeScreen },
  { name: 'Start', titleKey: 'new_game', component: StartScreen },
  { name: 'Scores', titleKey: 'high_scores', component: ScoresScreen },
  { name: 'BirdrJourneyList', titleKey: 'country_challenge', component: BirdrJourneyListScreen },
  { name: 'CountryChallengeLeaderboard', titleKey: 'country_challenge_leaderboard', component: CountryChallengeLeaderboardScreen },
  { name: 'BirdrJourneyIntro', titleKey: 'country_challenge', component: BirdrJourneyIntroScreen },
  { name: 'BirdrJourneyCountry', titleKey: 'birdr_journey_select_country', component: BirdrJourneyCountryScreen },
  { name: 'BirdrJourneyProgress', titleKey: 'country_challenge', component: BirdrJourneyProgressScreen },
  { name: 'BirdrJourneyStepIntro', titleKey: 'country_challenge', component: BirdrJourneyStepIntroScreen },
  { name: 'BirdrJourneyStepResults', titleKey: 'country_challenge', component: BirdrJourneyStepResultsScreen },
  { name: 'BirdrJourneyLevelCelebration', titleKey: 'country_challenge', component: BirdrJourneyLevelCelebrationScreen },
  { name: 'DailyChallenge', titleKey: 'daily_challenge', component: DailyChallengeListScreen },
  { name: 'DailyChallengeDetail', titleKey: 'daily_challenge', component: DailyChallengeDetailScreen },
  { name: 'DailyChallengeCreate', titleKey: 'new_daily_challenge', component: DailyChallengeCreateScreen },
  { name: 'ChallengePlay', titleKey: 'country_challenge', component: ChallengePlayScreen },
  { name: 'Updates', titleKey: 'updates', component: UpdatesScreen },
  { name: 'UpdateDetail', titleKey: 'updates', component: UpdateDetailScreen },
  { name: 'Help', titleKey: 'help', component: HelpOverviewScreen },
  { name: 'HelpDetail', titleKey: 'help', component: HelpDetailScreenWrapper },
  { name: 'MyGames', titleKey: 'my_games', component: MyGamesScreen },
  { name: 'Checklist', titleKey: 'checklist_title', component: ChecklistScreen },
  { name: 'TroubleSpots', titleKey: 'trouble_spots', component: TroubleSpotsScreen },
  { name: 'GameDetail', titleKey: 'game_details', component: GameDetailScreen },
  { name: 'Settings', titleKey: 'profile', component: ProfileScreen },
  { name: 'MediaReview', titleKey: 'review_media', component: MediaReviewScreen },
  { name: 'Login', titleKey: 'login', component: LoginScreen },
  { name: 'Register', titleKey: 'register', component: LoginScreen },
  { name: 'ForgotPassword', titleKey: 'forgot_password', component: ForgotPasswordScreen },
  { name: 'ResetPassword', titleKey: 'reset_password', component: ResetPasswordScreen },
  { name: 'Lobby', titleKey: 'game_lobby', component: LobbyScreen },
  { name: 'GamePlay', titleKey: 'game', component: GamePlayScreen },
  { name: 'GameResults', titleKey: 'results', component: GameResultsScreen },
];

export default function AppNavigator() {
  const { t } = useTranslation();
  return (
    <>
      <Stack.Navigator
        screenOptions={{
          header: ({ route, options }) => {
            const screen = SCREENS.find((s) => s.name === route.name);
            const defaultTitle = screen ? t(screen.titleKey) : route.name;
            // Screens can call navigation.setOptions({ title }) (e.g. GamePlay progress)
            const title =
              options.title != null && String(options.title).trim() !== ''
                ? String(options.title)
                : defaultTitle;
            return (
              <AppHeader
                routeName={route.name}
                title={title}
              />
            );
          },
        }}
      >
        {SCREENS.map((screen) => (
          <Stack.Screen
            key={screen.name}
            name={screen.name}
            component={screen.component}
          />
        ))}
      </Stack.Navigator>
      <LeftMenuModal />
      <UserMenuModal />
    </>
  );
}
