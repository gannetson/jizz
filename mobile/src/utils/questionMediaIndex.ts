/**
 * Question media selection (aligned with web `question-media-index.ts`).
 *
 * Backend `Question.number` is the 0-based index into the species media arrays.
 * `Question.sequence` is the Nth question in the game — do not use for media.
 */

export function mediaArrayLengthForQuestion(
  question: { images?: unknown[]; videos?: unknown[]; sounds?: unknown[] },
  mediaType: string
): number {
  if (mediaType === 'images') return question.images?.length ?? 0;
  if (mediaType === 'video') return question.videos?.length ?? 0;
  if (mediaType === 'audio') return question.sounds?.length ?? 0;
  return 0;
}

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
