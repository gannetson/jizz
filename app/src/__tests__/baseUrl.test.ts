import { resolveMediaUrl } from '../api/baseUrl';

describe('resolveMediaUrl', () => {
  it('keeps local Django media on http and uses the CRA proxy path', () => {
    expect(resolveMediaUrl('http://127.0.0.1:8050/media/levels/dove.png')).toBe(
      '/media/levels/dove.png'
    );
    expect(resolveMediaUrl('https://localhost:8050/media/levels/dove.png')).toBe(
      '/media/levels/dove.png'
    );
  });

  it('upgrades non-local http media to https', () => {
    expect(resolveMediaUrl('http://birdr.pro/media/levels/dove.png')).toBe(
      'https://birdr.pro/media/levels/dove.png'
    );
  });

  it('leaves production https URLs unchanged', () => {
    expect(resolveMediaUrl('https://birdr.pro/media/levels/dove.png')).toBe(
      'https://birdr.pro/media/levels/dove.png'
    );
  });
});
