import { apiUrl, getWebSocketUrl } from '../api/config';

describe('api config', () => {
  it('apiUrl prepends base and normalizes path', () => {
    expect(apiUrl('/api/games/')).toBe('https://birdr.pro/api/games/');
    expect(apiUrl('api/games/')).toBe('https://birdr.pro/api/games/');
  });

  it('getWebSocketUrl converts https to wss', () => {
    expect(getWebSocketUrl('/ws/game/')).toBe('wss://birdr.pro/ws/game/');
  });

  it('getWebSocketUrl converts http to ws', () => {
    const url = getWebSocketUrl('/ws/');
    expect(url.startsWith('ws')).toBe(true);
    expect(url).not.toContain('https');
  });
});
