/** Parse "1.59.0" (and optional suffixes like "-beta") into numeric tuple for comparison. */
function parseVersionParts(version: string): number[] {
  return version
    .trim()
    .split('.')
    .map((part) => {
      const match = part.match(/^\d+/);
      return match ? Number.parseInt(match[0], 10) : 0;
    });
}

/** True when `current` is strictly less than `minimum` (semver-style, numeric segments). */
export function isVersionLessThan(current: string, minimum: string): boolean {
  const a = parseVersionParts(current);
  const b = parseVersionParts(minimum);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av < bv) return true;
    if (av > bv) return false;
  }
  return false;
}
