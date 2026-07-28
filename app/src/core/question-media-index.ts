/**
 * Question media selection (MPG + single-player).
 *
 * Backend `Question.number` is the 0-based index into the species' eligible media list.
 * Live play payloads usually send a single item in `images`/`videos`/`sounds` at array index 0;
 * use `mediaSlotIndexFromQuestion` so both full and lean payloads work.
 *
 * `Question.sequence` is which turn in the game — never use it for media.
 *
 * Mixed-media games (flock Club Mix) lock type per question. Prefer `question.media`
 * (or infer from which array has items) over `game.media`, which may stay `images`.
 */

import { normalizeGameMedia } from './media-answer-gate';

export type PlayMediaQuestion = {
  media?: string | null;
  number?: number | string | null;
  images?: unknown[];
  videos?: unknown[];
  sounds?: unknown[];
  game?: { media?: string | null } | null;
};

/** Effective play media for this question (`images` | `video` | `audio`). */
export function resolvePlayMediaType(
  question: PlayMediaQuestion | null | undefined,
  gameMedia?: string | null
): 'images' | 'video' | 'audio' {
  if (question?.media) {
    return normalizeGameMedia(question.media);
  }
  if (question?.game?.media) {
    return normalizeGameMedia(question.game.media);
  }
  const hasImages = (question?.images?.length ?? 0) > 0;
  const hasVideos = (question?.videos?.length ?? 0) > 0;
  const hasSounds = (question?.sounds?.length ?? 0) > 0;
  if (hasSounds && !hasImages && !hasVideos) return 'audio';
  if (hasVideos && !hasImages) return 'video';
  if (hasImages) return 'images';
  return normalizeGameMedia(gameMedia);
}

export function currentPlayMediaItem<T>(
  items: T[] | undefined,
  question: { number?: number | string | null } | undefined
): T | undefined {
  if (!items?.length || !question) return undefined;
  const idx = mediaSlotIndexFromQuestion(question, items.length);
  return items[idx];
}

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
