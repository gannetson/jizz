import { isSoftUpdateAvailable, normalizeReleaseLabel } from './softUpdate';

describe('softUpdate', () => {
  it('normalizes labels case-insensitively', () => {
    expect(normalizeReleaseLabel(' Little Grebe ')).toBe('little grebe');
  });

  it('detects when store release differs from local codename', () => {
    expect(
      isSoftUpdateAvailable('1.78.0', 'Little Grebe', null, 'Common Kingfisher'),
    ).toBe(true);
    expect(
      isSoftUpdateAvailable('1.79.0', 'Little Grebe', '1.79.0', 'Little Grebe'),
    ).toBe(false);
    expect(isSoftUpdateAvailable(null, 'Little Grebe', null, 'Little Grebe')).toBe(false);
    expect(isSoftUpdateAvailable('1.79.0', null, null, 'Little Grebe')).toBe(false);
  });

  it('does not prompt when local semver is ahead of the public store (beta)', () => {
    expect(
      isSoftUpdateAvailable(
        '1.80.0',
        'Pied-billed Grebe',
        '1.79.0',
        'Little Grebe',
      ),
    ).toBe(false);
  });

  it('prompts when local semver is behind the public store', () => {
    expect(
      isSoftUpdateAvailable(
        '1.78.0',
        'Old Grebe',
        '1.79.0',
        'Little Grebe',
      ),
    ).toBe(true);
  });
});
