import React from 'react';
import { Image, type ImageProps } from 'expo-image';

/** Remote photos decoded to the view size and stored on disk, not as extra bitmaps. */
export function CachedRemoteImage(props: ImageProps) {
  return <Image allowDownscaling {...props} cachePolicy="disk" />;
}
