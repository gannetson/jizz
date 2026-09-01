export type VisualStyle = 'classic' | 'stylish' | 'none';

export const VISUAL_STYLE_STORAGE_KEY = 'birdr-visual-style';
export const DEFAULT_VISUAL_STYLE: VisualStyle = 'classic';

export function parseVisualStyle(value: unknown): VisualStyle {
  if (value === 'stylish' || value === 'none') return value;
  return 'classic';
}

export function showsGameArt(style: VisualStyle | null | undefined): boolean {
  return style !== 'none';
}

/** 1-based level number for badges when illustrations are off. */
export function journeyLevelNumber(sequence: number | null | undefined): number | null {
  if (sequence == null || !Number.isFinite(Number(sequence))) return null;
  return Math.trunc(Number(sequence)) + 1;
}
