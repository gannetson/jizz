import { isVersionLessThan } from './compareVersions';

describe('isVersionLessThan', () => {
  it('compares semver segments numerically', () => {
    expect(isVersionLessThan('1.58.9', '1.59.0')).toBe(true);
    expect(isVersionLessThan('1.59.0', '1.59.0')).toBe(false);
    expect(isVersionLessThan('1.62.0', '1.59.0')).toBe(false);
    expect(isVersionLessThan('1.9.0', '1.10.0')).toBe(true);
  });
});
