import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearTokens } from './auth';
import { clearStoredBirdrJourneyCountryCode, clearStoredBirdrJourneyPlayerToken } from './birdrJourney';
import { clearStoredChallengePlayerToken } from './challenge';
import { PLAYER_TOKEN_STORAGE_KEY } from './player';

const GAME_TOKEN_KEY = 'game-token';

/** Clear JWT and all locally stored player / journey session data (logout). */
export async function clearLocalSessionData(): Promise<void> {
  await clearTokens();
  await clearStoredBirdrJourneyCountryCode();
  await clearStoredBirdrJourneyPlayerToken();
  await clearStoredChallengePlayerToken();
  await AsyncStorage.multiRemove([PLAYER_TOKEN_STORAGE_KEY, GAME_TOKEN_KEY]);
}
