export type PlayLevel = 'beginner' | 'novice' | 'advanced' | 'pro' | 'expert';

export type GameRarity = 'familiar' | 'regular' | 'exceptional';

export type PlayLevelPreset = {
  level: string;
  rarity: GameRarity;
};

export const PLAY_LEVEL_PRESETS: Record<PlayLevel, PlayLevelPreset> = {
  beginner: { level: 'beginner', rarity: 'familiar' },
  novice: { level: 'beginner', rarity: 'regular' },
  advanced: { level: 'advanced', rarity: 'regular' },
  pro: { level: 'advanced', rarity: 'exceptional' },
  expert: { level: 'expert', rarity: 'exceptional' },
};

export const PLAY_LEVEL_ORDER: PlayLevel[] = [
  'beginner',
  'novice',
  'advanced',
  'pro',
  'expert',
];

export function settingsFromPlayLevel(playLevel: PlayLevel): PlayLevelPreset {
  return PLAY_LEVEL_PRESETS[playLevel];
}

export function playLevelFromSettings(level: string, rarity: string): PlayLevel {
  const match = PLAY_LEVEL_ORDER.find(
    (key) =>
      PLAY_LEVEL_PRESETS[key].level === level &&
      PLAY_LEVEL_PRESETS[key].rarity === rarity
  );
  return match ?? 'advanced';
}
