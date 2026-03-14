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
  mr: 'Marathi', sw: 'Swahili', af: 'Afrikaans',
};

export type LanguageLike = { code: string; name: string };

export function getLanguageDisplayName(lang: LanguageLike | null | undefined, locale: string): string {
  if (!lang) return '';
  if (locale === 'nl' && languageNamesNl[lang.code]) {
    return languageNamesNl[lang.code];
  }
  return lang.name;
}
