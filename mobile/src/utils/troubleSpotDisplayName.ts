import type { TroubleSpotSpecies } from '../api/practice';

/** Match game/checklist display rules for trouble-spot species rows. */
export function troubleSpotDisplayName(
  row: Pick<TroubleSpotSpecies, 'name' | 'name_translated' | 'name_nl'>,
  language: string,
): string {
  if (row.name_translated?.trim()) return row.name_translated.trim();
  const lang = language.toLowerCase();
  if (lang.startsWith('nl') && row.name_nl?.trim()) return row.name_nl.trim();
  return row.name;
}

export function troubleSpotPairDisplayName(
  name: string,
  nameNl: string | undefined,
  language: string,
): string {
  const lang = language.toLowerCase();
  if (lang.startsWith('nl') && nameNl?.trim()) return nameNl.trim();
  return name;
}
