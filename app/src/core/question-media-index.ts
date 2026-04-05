/**
 * Question media selection (MPG + single-player).
 *
 * Backend `Question.number` is the 0-based index into `species.images` / `.videos` / `.sounds`
 * for this question. `Question.sequence` is which turn in the game — never use it for media.
 */

export function mediaArrayLengthForQuestion(
  question: { images?: unknown[]; videos?: unknown[]; sounds?: unknown[] },
  gameMedia: string
): number {
  if (gameMedia === 'images') return question.images?.length ?? 0;
  if (gameMedia === 'video') return question.videos?.length ?? 0;
  if (gameMedia === 'audio') return question.sounds?.length ?? 0;
  return 0;
}

/**
 * Safe index into the images/videos/sounds array for the current question.
 */
export function mediaSlotIndexFromQuestion(
  question: { number?: number | string | null } | undefined,
  mediaLength: number
): number {
  if (!question) return 0;
  const raw = question.number;
  if (raw == null || raw === '') return 0;
  const n = typeof raw === 'string' ? parseInt(raw, 10) : Number(raw);
  if (!Number.isFinite(n)) return 0;
  const idx = Math.floor(n);
  if (mediaLength <= 0) return Math.max(0, idx);
  return Math.min(Math.max(0, idx), mediaLength - 1);
}
