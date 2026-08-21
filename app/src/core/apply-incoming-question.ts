export type PlayQuestionRef = {
  id?: number | null;
  sequence?: number | null;
};

function positiveInt(value: unknown): number | undefined {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

/**
 * True when `incoming` is an older round than `current` and should not replace it.
 * Used to drop late HTTP catch-up after WebSocket (or a newer GET) already advanced.
 */
export function isStalePlayQuestion(
  current: PlayQuestionRef | null | undefined,
  incoming: PlayQuestionRef | null | undefined
): boolean {
  const incomingId = positiveInt(incoming?.id);
  if (incomingId == null) return true;

  const currentId = positiveInt(current?.id);
  if (currentId == null) return false;
  if (incomingId === currentId) return false;

  const currentSeq = positiveInt(current?.sequence);
  const incomingSeq = positiveInt(incoming?.sequence);
  if (currentSeq != null && incomingSeq != null) {
    if (incomingSeq < currentSeq) return true;
    if (incomingSeq === currentSeq) return true;
    return false;
  }

  return incomingId < currentId;
}
