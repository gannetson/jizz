import type { ChecklistSpecies } from '../../api/checklist';

export type FrequencyGroupKey = 'common' | 'uncommon' | 'rare' | 'mega' | 'other';

const RARITY_LABELS: Record<string, string> = {
  abundant: 'Common',
  very_common: 'Common',
  common: 'Common',
  fairly_common: 'Uncommon',
  uncommon: 'Uncommon',
  rare: 'Rare',
  very_rare: 'Very rare',
  vagrant: 'MEGA!',
};

export const FREQUENCY_GROUP_ORDER: FrequencyGroupKey[] = [
  'common',
  'uncommon',
  'rare',
  'mega',
  'other',
];

export function frequencyGroupKey(frequency?: string | null): FrequencyGroupKey {
  if (!frequency) return 'other';
  if (frequency === 'vagrant') return 'mega';
  if (frequency === 'abundant' || frequency === 'very_common' || frequency === 'common') {
    return 'common';
  }
  if (frequency === 'fairly_common' || frequency === 'uncommon') {
    return 'uncommon';
  }
  if (frequency === 'rare' || frequency === 'very_rare') {
    return 'rare';
  }
  return 'other';
}

export function frequencyGroupLabel(
  key: FrequencyGroupKey,
  t: (translationKey: string, fallback?: string) => string
): string {
  const map: Record<FrequencyGroupKey, [string, string]> = {
    common: ['checklist_group_common', 'Common'],
    uncommon: ['checklist_group_uncommon', 'Uncommon'],
    rare: ['checklist_group_rare', 'Rare'],
    mega: ['checklist_group_mega', 'MEGA!'],
    other: ['checklist_group_other', 'Other'],
  };
  const [k, fallback] = map[key];
  return t(k, fallback);
}

export function frequencyLabel(
  frequency?: string | null,
  t?: (translationKey: string, fallback?: string) => string
): string | null {
  if (!frequency) return null;
  if (frequency === 'vagrant') {
    return t ? t('mega', 'MEGA!') : 'MEGA!';
  }
  if (frequency === 'very_rare') {
    return t ? t('checklist_frequency_very_rare', 'Very rare') : 'Very rare';
  }
  return RARITY_LABELS[frequency] || null;
}

export function isMega(frequency?: string | null): boolean {
  return frequency === 'vagrant';
}

export function isVeryRare(frequency?: string | null): boolean {
  return frequency === 'very_rare' || frequency === 'vagrant';
}

export type ChecklistSection = {
  key: FrequencyGroupKey;
  title: string;
  data: ChecklistSpecies[];
};

export function buildChecklistSections(
  species: ChecklistSpecies[],
  t: (translationKey: string, fallback?: string) => string
): ChecklistSection[] {
  const buckets: Record<FrequencyGroupKey, ChecklistSpecies[]> = {
    common: [],
    uncommon: [],
    rare: [],
    mega: [],
    other: [],
  };
  for (const sp of species) {
    buckets[frequencyGroupKey(sp.frequency)].push(sp);
  }
  return FREQUENCY_GROUP_ORDER.filter((key) => buckets[key].length > 0).map((key) => ({
    key,
    title: frequencyGroupLabel(key, t),
    data: buckets[key],
  }));
}

export function speciesDisplayName(s: ChecklistSpecies): string {
  return s.name_translated || s.name || s.name_latin;
}

export function formatChecklistDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return null;
  }
}

export function statsLine(
  s: ChecklistSpecies,
  t: (key: string, fallback?: string) => string
): string {
  if (s.status === 'identified') {
    const n = s.times_identified || s.times_encountered || 1;
    const last = formatChecklistDate(s.last_identified_at || s.last_encountered_at);
    const times = t('checklist_seen_times', `Seen ${n} time(s)`).replace('{n}', String(n));
    return last ? `${times} · ${last}` : times;
  }
  if (s.status === 'missed') {
    const last = formatChecklistDate(s.last_encountered_at);
    const base = t('checklist_missed_line', 'You missed this one');
    return last ? `${base} · ${last}` : base;
  }
  return t('checklist_not_seen_yet', 'Not seen yet');
}
