import { playLevelFromSettings, type PlayLevel } from './play-level';

export type GameHiscoresFilter = {
  country?: { code: string } | null;
  level: string;
  rarity?: string;
  length: number | string;
  media: string;
};

export type HiscoresFilterParams = {
  country: string;
  playLevel: PlayLevel;
  length: string;
  media: string;
};

export function hiscoresFiltersFromGame(game: GameHiscoresFilter): HiscoresFilterParams {
  return {
    country: game.country?.code ?? '',
    playLevel: playLevelFromSettings(game.level, game.rarity ?? 'regular'),
    length: String(game.length),
    media: game.media,
  };
}

export function buildHiscoresSearchParams(game: GameHiscoresFilter): URLSearchParams {
  const filters = hiscoresFiltersFromGame(game);
  const params = new URLSearchParams();
  if (filters.country) params.set('country', filters.country);
  params.set('playLevel', filters.playLevel);
  if (filters.length) params.set('length', filters.length);
  if (filters.media) params.set('media', filters.media);
  return params;
}

export function buildHiscoresPath(game: GameHiscoresFilter): string {
  const query = buildHiscoresSearchParams(game).toString();
  return query ? `/scores/?${query}` : '/scores/';
}

export function parseHiscoresSearchParams(search: URLSearchParams): Partial<HiscoresFilterParams> {
  const playLevel = search.get('playLevel');
  return {
    country: search.get('country') ?? undefined,
    playLevel:
      playLevel && ['beginner', 'novice', 'advanced', 'pro', 'expert'].includes(playLevel)
        ? (playLevel as PlayLevel)
        : undefined,
    length: search.get('length') ?? undefined,
    media: search.get('media') ?? undefined,
  };
}
