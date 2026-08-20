import { getTranslation, translations } from '../i18n/translations';
import {
  buildGameResultShareMessage,
  canShareGameResult,
  gameShareUrl,
  parseGameShareUrl,
} from '../api/gameShare';

const SHARE_I18N_KEYS = [
  'share_result',
  'game_result_title',
  'game_result_not_found',
  'game_result_share_message',
  'game_result_beat_me',
  'start_a_game',
  'birdr_home',
];

describe('game share i18n', () => {
  it.each(SHARE_I18N_KEYS)('has en and nl strings for %s', (key) => {
    expect(translations.en[key]).toBeTruthy();
    expect(translations.nl[key]).toBeTruthy();
    expect(getTranslation('en', key)).not.toBe(key);
    expect(getTranslation('nl', key)).not.toBe(key);
  });
});

describe('parseGameShareUrl', () => {
  it('parses https and custom scheme result links', () => {
    expect(parseGameShareUrl('https://birdr.pro/g/abcxyz/')).toBe('abcxyz');
    expect(parseGameShareUrl('birdr://g/abcxyz')).toBe('abcxyz');
  });

  it('ignores join and og image urls', () => {
    expect(parseGameShareUrl('https://birdr.pro/join/abcxyz/')).toBeNull();
    expect(parseGameShareUrl('https://birdr.pro/g/abcxyz/og.png')).toBeNull();
  });
});

describe('game share message', () => {
  it('includes score, location, and link', () => {
    const url = gameShareUrl('abcxyz');
    const msg = buildGameResultShareMessage(
      {
        scoreLabel: '450 pts',
        countryName: 'Netherlands',
        subtitle: 'Advanced · Pictures',
        shareUrl: url,
      },
      'en'
    );
    expect(msg).toContain('450 pts');
    expect(msg).toContain('Netherlands');
    expect(msg).toContain('/g/abcxyz/');
  });

  it('skips practice games', () => {
    expect(canShareGameResult({ token: 'x', ended: true, game_type: 'species_practice' })).toBe(
      false
    );
  });
});
