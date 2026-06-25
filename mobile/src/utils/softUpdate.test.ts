import { isSoftUpdateAvailable, normalizeReleaseLabel } from './softUpdate';

describe('softUpdate', () => {
  it('normalizes labels case-insensitively', () => {
    expect(normalizeReleaseLabel(' Little Grebe ')).toBe('little grebe');
  });

  it('detects when store release differs from local codename', () => {
    expect(isSoftUpdateAvailable('Little Grebe', 'Common Kingfisher')).toBe(true);
    expect(isSoftUpdateAvailable('Little Grebe', 'little grebe')).toBe(false);
    expect(isSoftUpdateAvailable(null, 'Little Grebe')).toBe(false);
    expect(isSoftUpdateAvailable('Little Grebe', null)).toBe(false);
  });
});
