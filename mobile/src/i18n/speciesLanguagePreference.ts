import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'species_language_independent';

/** When false (default), species/game language should track app UI locale (en/nl). */
export async function getSpeciesLanguageIndependent(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return false;
  }
}

/** Set true after user explicitly picks species language (start screen or profile). */
export async function setSpeciesLanguageIndependent(value: boolean): Promise<void> {
  try {
    if (value) await AsyncStorage.setItem(KEY, '1');
    else await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
