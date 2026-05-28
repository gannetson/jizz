import { getApiBaseUrl } from './baseUrl';
import type { Question } from '../core/app-context';

export type QuestionMediaPatch = Pick<Question, 'number' | 'images' | 'videos' | 'sounds'>;

/** After flagging, load the next eligible media item for this question. */
export async function postQuestionNextMedia(
  questionId: number,
  playerToken: string,
  excludedMediaId?: number
): Promise<QuestionMediaPatch> {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const response = await fetch(`${base}/api/questions/${questionId}/next-media/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      player_token: playerToken,
      ...(excludedMediaId != null ? { excluded_media_id: excludedMediaId } : {}),
    }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const msg =
      (data as { error?: string; detail?: string }).error ??
      (data as { detail?: string }).detail ??
      'next-media failed';
    throw new Error(typeof msg === 'string' ? msg : 'next-media failed');
  }
  return response.json() as Promise<QuestionMediaPatch>;
}
