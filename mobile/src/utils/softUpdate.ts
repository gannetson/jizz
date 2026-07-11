import { isVersionLessThan } from './compareVersions';

/** Normalize store / local release codenames for comparison. */
export function normalizeReleaseLabel(label: string): string {
  return label.trim().toLowerCase();
}

/**
 * True when the store has a newer public release than this build.
 * Compares semver first (so beta builds ahead of the store are not prompted),
 * then falls back to bird codenames when store semver is unavailable.
 */
export function isSoftUpdateAvailable(
  localVersion: string | null | undefined,
  localCodename: string | null | undefined,
  storeVersion: string | null | undefined,
  storeLabel: string | null | undefined,
): boolean {
  const localVer = localVersion?.trim();
  const storeVer = storeVersion?.trim();

  if (localVer && storeVer) {
    if (!isVersionLessThan(localVer, storeVer)) {
      return false;
    }
    return true;
  }

  const local = localCodename?.trim();
  const store = storeLabel?.trim();
  if (!local || !store) return false;
  return normalizeReleaseLabel(local) !== normalizeReleaseLabel(store);
}
