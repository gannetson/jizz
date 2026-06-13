import type { Game } from '../api/games';
import { playLevelFromSettings, type PlayLevel } from './playLevel';

export type HiscoresNavParams = {
  countryCode?: string;
  playLevel?: PlayLevel;
  length?: string;
  media?: string;
};

export function hiscoresParamsFromGame(game: Pick<Game, 'country' | 'level' | 'length' | 'media' | 'rarity'>): HiscoresNavParams {
  return {
    countryCode: game.country?.code,
    playLevel: playLevelFromSettings(game.level, game.rarity ?? 'regular'),
    length: String(game.length),
    media: game.media,
  };
}
