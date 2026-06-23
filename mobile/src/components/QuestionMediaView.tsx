import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
  Image as RnImage,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { setAudioModeAsync } from 'expo-audio';
import { MediaCredits } from './MediaCredits';
import { FullScreenImageViewerModal } from './FullScreenImageViewerModal';
import { QuestionMediaLoadingOverlay } from './QuestionMediaLoadingOverlay';
import { colors } from '../theme';
import {
  QUESTION_IMAGE_HEIGHT,
  QUESTION_VIDEO_HEIGHT,
} from '../constants/questionMediaLayout';
import { BIRDR_MOOD_IMAGES } from '../constants/birdrMoodImages';

export type MediaWithCredits = {
  contributor?: string | null;
  source?: string | null;
  link?: string | null;
};

export type QuestionMediaViewProps = {
  mediaType: 'images' | 'video' | 'audio';
  /** Image URI; when provided with onImageError, shows error placeholder on failure */
  imageUri?: string | null;
  imageError?: string | null;
  onImageError?: (message: string) => void;
  imageMedia?: MediaWithCredits | null;
  videoUri?: string | null;
  videoMedia?: MediaWithCredits | null;
  soundUri?: string | null;
  soundMedia?: MediaWithCredits | null;
  onPlaySound?: () => void;
  soundPlaying?: boolean;
  pulsatingStyle?: Animated.AnimatedProps<ViewStyle>;
  onFlagPress: () => void;
  flagLabel: string;
  /** Show loading placeholder when no media is available yet */
  showLoadingPlaceholder?: boolean;
  loadingLabel?: string;
  /** Shown when image failed to load */
  imageFailedLabel?: string;
  /** Label for the reload button when image failed to load */
  reloadImageLabel?: string;
  /** Label for skipping to the next image after a load failure */
  nextImageLabel?: string;
  /** When false, hide the next-image action (e.g. only one image available) */
  showNextImageButton?: boolean;
  /** Clear parent error state and reset media-ready when user retries image load */
  onImageRetry?: () => void;
  /** Parent should show the next media item (same as after flagging) */
  onImageAdvance?: () => void;
  playSoundLabel?: string;
  /** Optional container style override */
  containerStyle?: ViewStyle;
  /** Optional fixed height for image (e.g. for tablet layout) */
  imageHeight?: number;
  /** Optional fixed height for video (e.g. for tablet layout) */
  videoHeight?: number;
  /** Called when primary media is ready to interact with (image decoded, video playable, or audio UI shown). Use to avoid starting the answer timer before load. */
  onMediaReady?: () => void;
  /** Accessibility label for the tappable question image */
  expandImageLabel?: string;
  /** Accessibility hint (e.g. pinch to zoom) */
  expandImageHint?: string;
  /** Label for the full-screen viewer close control */
  closeFullScreenLabel?: string;
  /** Centered over the image/video/audio area (not credits row). */
  feedbackOverlay?: React.ReactNode;
};

function MediaStage({
  children,
  feedbackOverlay,
}: {
  children: React.ReactNode;
  feedbackOverlay?: React.ReactNode;
}) {
  return (
    <View style={styles.mediaStage}>
      {children}
      {feedbackOverlay ? (
        <View style={styles.feedbackOverlay} pointerEvents="none">
          {feedbackOverlay}
        </View>
      ) : null}
    </View>
  );
}

export function QuestionMediaView({
  mediaType,
  imageUri,
  imageError,
  onImageError,
  imageMedia,
  videoUri,
  videoMedia,
  soundUri,
  soundMedia,
  onPlaySound,
  soundPlaying = false,
  pulsatingStyle,
  onFlagPress,
  flagLabel,
  showLoadingPlaceholder = false,
  loadingLabel = 'Loading…',
  imageFailedLabel = '',
  reloadImageLabel = 'Retry',
  nextImageLabel = 'Next image',
  showNextImageButton = true,
  onImageRetry,
  onImageAdvance,
  playSoundLabel = '🔊 Play sound',
  containerStyle,
  imageHeight,
  videoHeight,
  onMediaReady,
  expandImageLabel = 'View image full screen',
  expandImageHint = 'Opens full screen. Pinch to zoom.',
  closeFullScreenLabel = 'Close',
  feedbackOverlay,
}: QuestionMediaViewProps) {
  const [fullScreenImage, setFullScreenImage] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageProgress, setImageProgress] = React.useState<number | null>(null);
  const [videoReady, setVideoReady] = React.useState(false);
  const [imageReloadKey, setImageReloadKey] = React.useState(0);
  const mediaReadyOnce = React.useRef(false);
  const fireMediaReady = React.useCallback(() => {
    if (!onMediaReady || mediaReadyOnce.current) return;
    mediaReadyOnce.current = true;
    onMediaReady();
  }, [onMediaReady]);

  function wikimediaMp4(url: string) {
    // iOS doesn't support webm, ogv, ogg video; use Wikimedia transcoded mov
    const match = url.match(/.*commons\/(.+\/.+\/.+\.(webm|ogv|ogg))$/i);
    if (!match) return url;
    const path = match[1];
    const filename = path.split('/').pop();
    return `https://upload.wikimedia.org/wikipedia/commons/transcoded/${path}/${filename}.144p.mjpeg.mov`;
  }

  const displayVideoUri =
    mediaType === 'video' && videoUri
      ? Platform.OS === 'ios'
        ? wikimediaMp4(videoUri)
        : videoUri
      : null;

  React.useEffect(() => {
    mediaReadyOnce.current = false;
    setImageLoaded(false);
    setImageProgress(null);
    setVideoReady(false);
  }, [imageUri, videoUri, soundUri, mediaType, displayVideoUri, imageReloadKey]);

  const handleImageRetry = React.useCallback(() => {
    mediaReadyOnce.current = false;
    setImageLoaded(false);
    setImageProgress(null);
    setImageReloadKey((key) => key + 1);
    onImageRetry?.();
  }, [onImageRetry]);

  const handleImageNext = React.useCallback(() => {
    mediaReadyOnce.current = false;
    setImageLoaded(false);
    setImageProgress(null);
    onImageAdvance?.();
  }, [onImageAdvance]);

  const hasMedia =
    (mediaType === 'images' && (imageUri || imageError !== undefined)) ||
    (mediaType === 'video' && !!displayVideoUri) ||
    (mediaType === 'audio' && soundUri);

  // Configure audio session for video playback on iOS so video has sound and native controls work
  React.useEffect(() => {
    if (mediaType !== 'video' || !displayVideoUri) return;
    setAudioModeAsync({
      playsInSilentMode: false,
      allowsRecording: false,
      shouldPlayInBackground: false,
      interruptionMode: 'duckOthers',
    }).catch(() => {});
  }, [mediaType, displayVideoUri]);

  const videoPlayer = useVideoPlayer(
    mediaType === 'video' && displayVideoUri ? displayVideoUri : null,
    (player) => {
      if (mediaType === 'video' && displayVideoUri) player.play();
    }
  );

  React.useEffect(() => {
    if (mediaType === 'video' && displayVideoUri && onMediaReady) {
      const sub = videoPlayer.addListener('statusChange', ({ status }: { status: string }) => {
        if (status === 'readyToPlay') {
          setVideoReady(true);
          fireMediaReady();
        }
      });
      return () => sub.remove();
    }
  }, [mediaType, displayVideoUri, videoPlayer, onMediaReady, fireMediaReady]);

  React.useEffect(() => {
    if (mediaType === 'audio' && soundUri) fireMediaReady();
  }, [mediaType, soundUri, fireMediaReady]);

  React.useEffect(() => {
    if (mediaType === 'images' && !imageUri) fireMediaReady();
  }, [mediaType, imageUri, fireMediaReady]);

  const creditsMedia =
    mediaType === 'images' ? imageMedia : mediaType === 'video' ? videoMedia : soundMedia;
  const showCreditsAndFlag = hasMedia;

  const renderCreditsRow = () =>
    showCreditsAndFlag ? (
      <View style={styles.creditsRow}>
        <MediaCredits media={creditsMedia ?? undefined} />
        <TouchableOpacity style={styles.flagLink} onPress={onFlagPress}>
          <Text style={styles.flagLinkText}>🚩 {flagLabel}</Text>
        </TouchableOpacity>
      </View>
    ) : null;

  return (
    <View style={[styles.mediaWrap, containerStyle]}>
      {mediaType === 'images' && (
        <>
          {imageUri && !imageError ? (
            <MediaStage feedbackOverlay={feedbackOverlay}>
              <Pressable
                onPress={() => imageLoaded && setFullScreenImage(true)}
                accessibilityRole="button"
                accessibilityLabel={expandImageLabel}
                accessibilityHint={expandImageHint}
                disabled={!imageLoaded}
              >
                <View
                  style={[
                    styles.imageFrame,
                    imageHeight != null && { height: imageHeight },
                  ]}
                >
                  <Image
                    key={`${imageUri}-${imageReloadKey}`}
                    style={styles.image}
                    contentFit="contain"
                    source={{
                      uri: imageUri,
                      headers: {
                        'User-Agent': 'BirdrApp/1.0 (https://birdr.pro)',
                      },
                    }}
                    onLoadStart={() => {
                      setImageLoaded(false);
                      setImageProgress(null);
                    }}
                    onProgress={({ loaded, total }) => {
                      if (total > 0) {
                        setImageProgress(loaded / total);
                      }
                    }}
                    onLoad={() => {
                      setImageLoaded(true);
                      fireMediaReady();
                    }}
                    onError={(e) => {
                      const message = e.error || 'Unknown image error';
                      onImageError?.(message);
                      setImageLoaded(true);
                      fireMediaReady();
                    }}
                  />
                  {!imageLoaded ? (
                    <QuestionMediaLoadingOverlay progress={imageProgress} />
                  ) : null}
                </View>
              </Pressable>
              <FullScreenImageViewerModal
                visible={fullScreenImage}
                imageUri={
                  imageUri.includes('/900') ? imageUri.replace('/900', '/1800') : imageUri
                }
                onClose={() => setFullScreenImage(false)}
                closeLabel={closeFullScreenLabel}
              />
            </MediaStage>
          ) : imageError ? (
            <MediaStage feedbackOverlay={feedbackOverlay}>
              <View
                style={[
                  styles.placeholder,
                  styles.errorPlaceholder,
                  imageHeight != null && { minHeight: imageHeight },
                ]}
              >
                <RnImage
                  source={BIRDR_MOOD_IMAGES.noimage}
                  style={styles.placeholderImage}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                />
                <Text style={styles.placeholderSubtext}>{imageFailedLabel}</Text>
                <View style={styles.errorActions}>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={handleImageRetry}
                    testID="questionMedia.retryImage"
                    accessibilityRole="button"
                    accessibilityLabel={reloadImageLabel}
                  >
                    <Text style={styles.retryButtonText}>{reloadImageLabel}</Text>
                  </TouchableOpacity>
                  {onImageAdvance && showNextImageButton ? (
                    <TouchableOpacity
                      style={styles.nextImageButton}
                      onPress={handleImageNext}
                      testID="questionMedia.nextImage"
                      accessibilityRole="button"
                      accessibilityLabel={nextImageLabel}
                    >
                      <Text style={styles.nextImageButtonText}>{nextImageLabel}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </MediaStage>
          ) : null}
          {renderCreditsRow()}
        </>
      )}

      {mediaType === 'video' && displayVideoUri && (
        <>
          <MediaStage feedbackOverlay={feedbackOverlay}>
            <View
              style={[
                styles.videoFrame,
                videoHeight != null && { height: videoHeight },
              ]}
            >
              <VideoView
                key={displayVideoUri}
                player={videoPlayer}
                style={styles.video}
                nativeControls={true}
                contentFit="contain"
              />
              {!videoReady ? <QuestionMediaLoadingOverlay /> : null}
            </View>
          </MediaStage>
          {renderCreditsRow()}
        </>
      )}

      {mediaType === 'audio' && soundUri && (
        <>
          <MediaStage feedbackOverlay={feedbackOverlay}>
            {pulsatingStyle ? (
              <Animated.View style={soundPlaying ? pulsatingStyle : undefined}>
                <TouchableOpacity
                  style={[styles.mediaLink, soundPlaying && styles.mediaLinkPlaying]}
                  onPress={onPlaySound}
                >
                  <Text
                    style={[styles.mediaLinkText, soundPlaying && styles.mediaLinkTextPlaying]}
                  >
                    {playSoundLabel}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <TouchableOpacity
                style={[styles.mediaLink, soundPlaying && styles.mediaLinkPlaying]}
                onPress={onPlaySound}
              >
                <Text
                  style={[styles.mediaLinkText, soundPlaying && styles.mediaLinkTextPlaying]}
                >
                  {playSoundLabel}
                </Text>
              </TouchableOpacity>
            )}
          </MediaStage>
          {renderCreditsRow()}
        </>
      )}

      {showLoadingPlaceholder && !hasMedia && (
        <MediaStage feedbackOverlay={feedbackOverlay}>
          <View style={[styles.placeholder, imageHeight != null && { height: imageHeight }]}>
            <RnImage
              source={BIRDR_MOOD_IMAGES.stressed}
              style={styles.placeholderImage}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
            <Text style={styles.placeholderSubtext}>{loadingLabel}</Text>
          </View>
        </MediaStage>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mediaWrap: {
    marginBottom: 0,
  },
  mediaStage: {
    position: 'relative',
  },
  feedbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  creditsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: colors.primary[100],
  },
  imageFrame: {
    position: 'relative',
    width: '100%',
    height: QUESTION_IMAGE_HEIGHT,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.primary[100],
  },
  video: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#000',
  },
  videoFrame: {
    position: 'relative',
    width: '100%',
    height: QUESTION_VIDEO_HEIGHT,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  placeholder: {
    width: '100%',
    height: QUESTION_IMAGE_HEIGHT,
    borderRadius: 8,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorPlaceholder: {
    justifyContent: 'flex-start',
    paddingTop: 20,
    height: undefined,
    minHeight: QUESTION_IMAGE_HEIGHT,
  },
  placeholderImage: { width: 160, height: 160, marginBottom: 8 },
  placeholderSubtext: { fontSize: 14, color: colors.primary[600], textAlign: 'center', paddingHorizontal: 16 },
  errorActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.primary[500],
    borderRadius: 8,
  },
  retryButtonText: { color: colors.primary[50], fontSize: 16, fontWeight: '600' },
  nextImageButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.primary[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  nextImageButtonText: { color: colors.primary[700], fontSize: 16, fontWeight: '600' },
  mediaLink: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.primary[100],
    borderRadius: 8,
    marginTop: 8,
  },
  mediaLinkPlaying: { backgroundColor: colors.primary[500] },
  mediaLinkText: { fontSize: 16, color: colors.primary[700], fontWeight: '600' },
  mediaLinkTextPlaying: { color: colors.primary[50] },
  flagLink: { marginTop: 8 },
  flagLinkText: { fontSize: 13, color: colors.error[500] },
});
