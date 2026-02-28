import { getTranslation } from '../i18n/translations';

describe('getTranslation', () => {
  it('returns en string for known key', () => {
    expect(getTranslation('en', 'cancel')).toBe('Cancel');
    expect(getTranslation('en', 'login')).toBe('Login');
  });

  it('returns nl string for known key when locale is nl', () => {
    expect(getTranslation('nl', 'cancel')).toBe('Annuleren');
    expect(getTranslation('nl', 'login')).toBe('Inloggen');
  });

  it('replaces params in message', () => {
    expect(getTranslation('en', 'species_reviewed', { count: 5 })).toBe('5 reviewed');
    expect(getTranslation('en', 'media_approved_count', { count: 10 })).toBe('Media approved 10/10');
  });

  it('falls back to key when key is unknown', () => {
    expect(getTranslation('en', 'unknown_key')).toBe('unknown_key');
  });

  it('falls back to en when locale is unknown', () => {
    const result = getTranslation('de' as any, 'cancel');
    expect(result).toBe('Cancel');
  });
});
