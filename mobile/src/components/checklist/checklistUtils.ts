import type { ChecklistSpecies } from '../../api/checklist';

const RARITY_LABELS: Record<string, string> = {
  abundant: 'Common',
  very_common: 'Common',
  common: 'Common',
  fairly_common: 'Uncommon',
  uncommon: 'Uncommon',
  rare: 'Rare',
  very_rare: 'VERY RARE',
  vagrant: 'VERY RARE',
};

export function frequencyLabel(frequency?: string | null): string | null {
  if (!frequency) return null;
  return RARITY_LABELS[frequency] || null;
}

export function isVeryRare(frequency?: string | null): boolean {
  return frequency === 'very_rare' || frequency === 'vagrant';
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
