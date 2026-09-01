export type VisualStyle = 'classic' | 'stylish' | 'none';

export const VISUAL_STYLE_STORAGE_KEY = 'birdr-visual-style';
export const DEFAULT_VISUAL_STYLE: VisualStyle = 'classic';
export const MAX_BIRDR_LEVEL = 7;

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

export function readStoredVisualStyle(): VisualStyle {
  try {
    return parseVisualStyle(localStorage.getItem(VISUAL_STYLE_STORAGE_KEY));
  } catch {
    return DEFAULT_VISUAL_STYLE;
  }
}

export function writeStoredVisualStyle(style: VisualStyle): void {
  try {
    localStorage.setItem(VISUAL_STYLE_STORAGE_KEY, style);
  } catch {
    /* ignore */
  }
}

const STYLISH_ASSET_VERSION = '2';

export function birdrImage(filename: string, style: VisualStyle = DEFAULT_VISUAL_STYLE): string {
  const name = filename.replace(/^\//, '').replace(/^images\//, '');
  if (style === 'stylish') {
    return `/images/stylish/${name}?v=${STYLISH_ASSET_VERSION}`;
  }
  return `/images/${name}`;
}

export function journeyLevelIconUrl(
  sequence: number | null | undefined,
  apiIconUrl: string | null | undefined,
  style: VisualStyle = DEFAULT_VISUAL_STYLE,
): string | null {
  if (!showsGameArt(style)) return null;
  if (style === 'stylish' && sequence != null && Number.isFinite(Number(sequence))) {
    const n = Math.max(0, Math.min(MAX_BIRDR_LEVEL, Math.trunc(Number(sequence))));
    return `/images/stylish/birdr-level${n}.png?v=${STYLISH_ASSET_VERSION}`;
  }
  return apiIconUrl ?? null;
}
