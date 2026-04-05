import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ViewStyle,
  Animated,
  Platform,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { setAudioModeAsync } from 'expo-audio';
import { MediaCredits } from './MediaCredits';
import { colors } from '../theme';

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
  playSoundLabel?: string;
  /** Optional container style override */
  containerStyle?: ViewStyle;
  /** Optional fixed height for image (e.g. for tablet layout) */
  imageHeight?: number;
  /** Optional fixed height for video (e.g. for tablet layout) */
  videoHeight?: number;
  /** Called when primary media is ready to interact with (image decoded, video playable, or audio UI shown). Use to avoid starting the answer timer before load. */
  onMediaReady?: () => void;
};

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
  playSoundLabel = '🔊 Play sound',
  containerStyle,
  imageHeight,
  videoHeight,
  onMediaReady,
}: QuestionMediaViewProps) {
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
  }, [imageUri, videoUri, soundUri, mediaType, displayVideoUri]);

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
        if (status === 'readyToPlay') fireMediaReady();
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
            <Image
              style={[styles.image, imageHeight != null && { height: imageHeight }]}
              resizeMode="contain"
              source={{
                uri: imageUri,
                headers: {
                  'User-Agent': 'BirdrApp/1.0 (https://birdr.pro)',
                },
              }}
              onLoad={() => fireMediaReady()}
              onError={(e) => {
                const message =
                  (e as any)?.error?.message ||
                  (e as any)?.nativeEvent?.error ||
                  'Unknown image error';
                onImageError?.(message);
                fireMediaReady();
              }}
            />
          ) : imageError !== undefined || (imageUri && imageError) ? (
            <View style={[styles.placeholder, imageHeight != null && { height: imageHeight }]}>
              <Text style={styles.placeholderText}>🖼</Text>
              <Text style={styles.placeholderSubtext}>{imageFailedLabel}</Text>
              {imageError ? (
                <Text style={styles.placeholderSubtext}>{imageError}</Text>
              ) : null}
            </View>
          ) : null}
          {renderCreditsRow()}
        </>
      )}

      {mediaType === 'video' && displayVideoUri && (
        <>
          <VideoView
            key={displayVideoUri}
            player={videoPlayer}
            style={[styles.video, videoHeight != null && { height: videoHeight }]}
            nativeControls={true}
            contentFit="contain"
          />
          {renderCreditsRow()}
        </>
      )}

      {mediaType === 'audio' && soundUri && (
        <>
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
          {renderCreditsRow()}
        </>
      )}

      {showLoadingPlaceholder && !hasMedia && (
        <View style={[styles.placeholder, imageHeight != null && { height: imageHeight }]}>
          <Text style={styles.placeholderText}>🖼</Text>
          <Text style={styles.placeholderSubtext}>{loadingLabel}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mediaWrap: {
    minHeight: 200,
    marginBottom: 0,
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
    height: 280,
    borderRadius: 8,
    backgroundColor: colors.primary[100],
  },
  video: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    backgroundColor: '#000',
  },
  placeholder: {
    width: '100%',
    height: 280,
    borderRadius: 8,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { fontSize: 48, marginBottom: 8 },
  placeholderSubtext: { fontSize: 14, color: colors.primary[600] },
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
