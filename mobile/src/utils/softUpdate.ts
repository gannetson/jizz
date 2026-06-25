/** Normalize store / local release codenames for comparison. */
export function normalizeReleaseLabel(label: string): string {
  return label.trim().toLowerCase();
}

/** True when the store lists a different release than this build (bird codename). */
export function isSoftUpdateAvailable(
  localCodename: string | null | undefined,
  storeLabel: string | null | undefined,
): boolean {
  const local = localCodename?.trim();
  const store = storeLabel?.trim();
  if (!local || !store) return false;
  return normalizeReleaseLabel(local) !== normalizeReleaseLabel(store);
}
