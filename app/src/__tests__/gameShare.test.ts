import {
  buildGameShareUrl,
  canShareGameResult,
  formatGameResultShareMessage,
  getGameSharePath,
} from '../api/gameShare';

describe('game share helpers', () => {
  it('builds a public result URL', () => {
    expect(getGameSharePath('abcxyz')).toBe('/g/abcxyz/');
    expect(buildGameShareUrl('abcxyz', 'https://birdr.pro')).toBe('https://birdr.pro/g/abcxyz/');
  });

  it('formats a share message with score and link', () => {
    const url = 'https://birdr.pro/g/abcxyz/';
    const message = formatGameResultShareMessage(
      '450 pts',
      'Netherlands',
      url,
      'Advanced · Pictures · 10 birds'
    );
    expect(message).toContain('450 pts');
    expect(message).toContain('Netherlands');
    expect(message).toContain(url);
    expect(message).toContain('Can you beat me');
  });

  it('does not share practice games', () => {
    expect(canShareGameResult({ token: 'x', ended: true, game_type: 'pair_practice' })).toBe(false);
    expect(canShareGameResult({ token: 'x', ended: true, game_type: 'standard' })).toBe(true);
    expect(canShareGameResult({ token: 'x', ended: true })).toBe(true);
    expect(canShareGameResult({ token: undefined, ended: true })).toBe(false);
  });
});
