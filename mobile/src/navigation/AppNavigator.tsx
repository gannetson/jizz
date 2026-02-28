import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppHeader } from '../components/AppHeader';
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
import { MyGamesScreen } from '../screens/MyGamesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ChallengeScreen } from '../screens/ChallengeScreen';
import { ChallengePlayScreen } from '../screens/ChallengePlayScreen';
import { GameDetailScreen } from '../screens/GameDetailScreen';

const Stack = createNativeStackNavigator();

const SCREENS = [
  { name: 'Home', title: 'Birdr', component: HomeScreen },
  { name: 'Start', title: 'New game', component: StartScreen },
  { name: 'Scores', title: 'High scores', component: ScoresScreen },
  { name: 'Challenge', title: 'Country challenge', component: ChallengeScreen },
  { name: 'ChallengePlay', title: 'Challenge', component: ChallengePlayScreen },
  { name: 'Updates', title: 'Updates', component: UpdatesScreen },
  { name: 'Help', title: 'Help', component: HelpOverviewScreen },
  { name: 'HelpDetail', title: 'Help', component: HelpDetailScreenWrapper },
  { name: 'MyGames', title: 'My Games', component: MyGamesScreen },
  { name: 'GameDetail', title: 'Game details', component: GameDetailScreen },
  { name: 'Settings', title: 'Profile', component: ProfileScreen },
  { name: 'MediaReview', title: 'Review media', component: MediaReviewScreen },
  { name: 'Login', title: 'Login', component: LoginScreen },
  { name: 'Register', title: 'Register', component: LoginScreen },
  { name: 'Lobby', title: 'Game Lobby', component: LobbyScreen },
  { name: 'GamePlay', title: 'Game', component: GamePlayScreen },
  { name: 'GameResults', title: 'Results', component: GameResultsScreen },
];

export default function AppNavigator() {
  return (
    <>
      <Stack.Navigator
        screenOptions={{
          header: ({ route }) => (
            <AppHeader
              routeName={route.name}
              title={
                route.name === 'Home'
                  ? 'Birdr'
                  : SCREENS.find((s) => s.name === route.name)?.title ?? route.name
              }
            />
          ),
        }}
      >
        {SCREENS.map((screen) => (
          <Stack.Screen
            key={screen.name}
            name={screen.name}
            component={screen.component}
            options={{ title: screen.title }}
          />
        ))}
      </Stack.Navigator>
      <LeftMenuModal />
      <UserMenuModal />
    </>
  );
}
