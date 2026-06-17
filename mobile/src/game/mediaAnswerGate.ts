/** Sound rounds: answers are not blocked on image/video load; timing uses media-ready POST separately. */
export function isSoundGameMedia(mediaType: string | undefined | null): boolean {
  return mediaType === 'audio' || mediaType === 'sounds';
}

export function normalizeGameMedia(mediaType: string | undefined | null): 'images' | 'video' | 'audio' {
  if (mediaType === 'video') return 'video';
  if (isSoundGameMedia(mediaType)) return 'audio';
  return 'images';
}

export function answersEnabledForMedia(mediaType: string | undefined | null, mediaReady: boolean): boolean {
  return isSoundGameMedia(mediaType) || mediaReady;
}
