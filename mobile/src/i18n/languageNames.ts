/**
 * Dutch names for languages (code -> Dutch name).
 * Used when app language is Dutch. Fallback to API name if code not in map.
 */
export const languageNamesNl: Record<string, string> = {
  en: 'Engels', en_UK: 'Engels (VK)', en_US: 'Engels (VS)', nl: 'Nederlands', de: 'Duits',
  fr: 'Frans', es: 'Spaans', it: 'Italiaans', pt: 'Portugees', pl: 'Pools', ru: 'Russisch',
  ja: 'Japans', zh: 'Chinees', sv: 'Zweeds', da: 'Deens', no: 'Noors', fi: 'Fins', el: 'Grieks',
  tr: 'Turks', ar: 'Arabisch', he: 'Hebreeuws', hu: 'Hongaars', ro: 'Roemeens', cs: 'Tsjechisch',
  sk: 'Slovaaks', bg: 'Bulgaars', hr: 'Kroatisch', sr: 'Servisch', uk: 'Oekraïens', id: 'Indonesisch',
  ms: 'Maleis', th: 'Thais', vi: 'Vietnamees', ko: 'Koreaans', ca: 'Catalaans', eu: 'Baskisch',
  ga: 'Iers', cy: 'Welsh', lt: 'Litouws', lv: 'Letlands', et: 'Estlands', sl: 'Sloveens',
  mk: 'Macedonisch', sq: 'Albanees', hi: 'Hindi', bn: 'Bengalees', ta: 'Tamil', te: 'Telugu',
  mr: 'Marathi', sw: 'Swahili', af: 'Afrikaans', la: 'Wetenschappelijk (Latijn)',
};

export type LanguageLike = { code: string; name: string };

export const SCIENTIFIC_LANGUAGE_CODE = 'la';
export const SCIENTIFIC_LANGUAGE_NAME_EN = 'Scientific (Latin)';
export const SCIENTIFIC_LANGUAGE_NAME_NL = 'Wetenschappelijk (Latijn)';

const SCIENTIFIC_LANGUAGE_NAMES: Record<string, string> = {
  en: SCIENTIFIC_LANGUAGE_NAME_EN,
  nl: SCIENTIFIC_LANGUAGE_NAME_NL,
  es: 'Científico (latín)',
  fr: 'Scientifique (latin)',
  de: 'Wissenschaftlich (Latein)',
  it: 'Scientifico (latino)',
  'pt-BR': 'Científico (latim)',
  ja: '学名（ラテン語）',
};

function languageTagForDisplay(code: string): string {
  if (code === 'en_UK') return 'en-GB';
  if (code === 'en_US') return 'en-US';
  return code.replace(/_/g, '-');
}

export function withScientificLanguage<T extends LanguageLike>(languages: T[]): T[] {
  const rest = languages.filter((l) => l.code !== 'la');
  return [{ code: 'la', name: SCIENTIFIC_LANGUAGE_NAME_EN } as T, ...rest];
}

export function getLanguageDisplayName(lang: LanguageLike | null | undefined, locale: string): string {
  if (!lang) return '';
  if (lang.code === 'la') {
    return SCIENTIFIC_LANGUAGE_NAMES[locale] || SCIENTIFIC_LANGUAGE_NAME_EN;
  }
  if (locale === 'nl' && languageNamesNl[lang.code]) {
    return languageNamesNl[lang.code];
  }
  if (locale && locale !== 'en') {
    try {
      const names = new Intl.DisplayNames([locale], { type: 'language' });
      const label = names.of(languageTagForDisplay(lang.code));
      if (label) return label;
    } catch {
      /* ignore */
    }
  }
  return lang.name;
}

/** Scientific (`la`) stays first; remaining languages sort A–Z by display name. */
export function compareSpeciesLanguages(
  a: LanguageLike,
  b: LanguageLike,
  locale: string
): number {
  if (a.code === 'la' && b.code !== 'la') return -1;
  if (b.code === 'la' && a.code !== 'la') return 1;
  return getLanguageDisplayName(a, locale).localeCompare(
    getLanguageDisplayName(b, locale),
    undefined,
    { sensitivity: 'base' }
  );
}
