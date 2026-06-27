/** Default media stage heights — keep in sync with QuestionMediaView imageFrame / videoFrame. */
export const QUESTION_IMAGE_HEIGHT = 280;
export const QUESTION_VIDEO_HEIGHT = 220;
/** Space reserved for credits + flag row below the image/video stage. */
export const QUESTION_MEDIA_CREDITS_HEIGHT = 34;
export const QUESTION_AUDIO_CONTROL_HEIGHT = 56;

export type QuestionMediaType = 'images' | 'video' | 'audio';

export function questionMediaStageHeight(
  mediaType: QuestionMediaType,
  options?: { imageHeight?: number; videoHeight?: number }
): number {
  if (mediaType === 'video') {
    return options?.videoHeight ?? QUESTION_VIDEO_HEIGHT;
  }
  if (mediaType === 'audio') {
    return QUESTION_AUDIO_CONTROL_HEIGHT;
  }
  return options?.imageHeight ?? QUESTION_IMAGE_HEIGHT;
}

/** Total vertical space for media + credits row (matches QuestionMediaView layout). */
export function questionMediaBlockHeight(
  mediaType: QuestionMediaType,
  options?: { imageHeight?: number; videoHeight?: number }
): number {
  const stage = questionMediaStageHeight(mediaType, options);
  const credits = mediaType === 'audio' ? 0 : QUESTION_MEDIA_CREDITS_HEIGHT;
  return stage + credits;
}
