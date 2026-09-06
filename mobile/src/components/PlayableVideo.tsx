import React from 'react';
import { StyleSheet, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { playVideoFallbackUrl, playVideoStillUrl, playVideoUrl } from '../utils/playVideoUrl';

type PlayableVideoProps = {
  uri: string;
  style?: StyleProp<ViewStyle>;
  autoPlay?: boolean;
  nativeControls?: boolean;
  onReady?: () => void;
};

const IOS_STILL_FALLBACK_MS = 5000;

export function PlayableVideo({
  uri,
  style,
  autoPlay = false,
  nativeControls = true,
  onReady,
}: PlayableVideoProps) {
  const stillUri = playVideoStillUrl(uri);
  const [currentUri, setCurrentUri] = React.useState(() => playVideoUrl(uri, Platform.OS));
  const [showStill, setShowStill] = React.useState(false);
  const triedRef = React.useRef<Set<string>>(new Set([playVideoUrl(uri, Platform.OS)]));
  const skipReplaceRef = React.useRef(true);
  const readyRef = React.useRef(false);
  const onReadyRef = React.useRef(onReady);
  onReadyRef.current = onReady;

  React.useEffect(() => {
    const next = playVideoUrl(uri, Platform.OS);
    triedRef.current = new Set([next]);
    readyRef.current = false;
    skipReplaceRef.current = true;
    setShowStill(false);
    setCurrentUri(next);
  }, [uri]);

  const player = useVideoPlayer(showStill ? null : currentUri, (p) => {
    if (autoPlay) p.play();
  });

  const failOver = React.useCallback(
    (failedUrl: string) => {
      if (readyRef.current || showStill) return;
      const next = playVideoFallbackUrl(uri, failedUrl, Platform.OS);
      if (next && !triedRef.current.has(next)) {
        triedRef.current.add(next);
        setCurrentUri(next);
        return;
      }
      if (stillUri) {
        setShowStill(true);
        return;
      }
      onReadyRef.current?.();
    },
    [uri, stillUri, showStill],
  );

  React.useEffect(() => {
    if (showStill) return;
    if (skipReplaceRef.current) {
      skipReplaceRef.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await player.replaceAsync(currentUri);
        if (!cancelled && autoPlay) player.play();
      } catch {
        if (!cancelled) failOver(currentUri);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUri, player, autoPlay, showStill, failOver]);

  React.useEffect(() => {
    if (showStill) return;
    const sub = player.addListener('statusChange', ({ status }: { status: string }) => {
      if (status === 'readyToPlay') {
        readyRef.current = true;
        onReadyRef.current?.();
        return;
      }
      if (status !== 'error') return;
      failOver(currentUri);
    });
    return () => sub.remove();
  }, [player, currentUri, showStill, failOver]);

  React.useEffect(() => {
    if (showStill || Platform.OS !== 'ios' || !stillUri) return;
    const timer = setTimeout(() => {
      if (!readyRef.current) failOver(currentUri);
    }, IOS_STILL_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [currentUri, showStill, stillUri, failOver]);

  if (showStill && stillUri) {
    return (
      <Image
        source={{ uri: stillUri }}
        style={style ?? styles.video}
        contentFit="contain"
        onLoad={() => onReadyRef.current?.()}
        onError={() => onReadyRef.current?.()}
      />
    );
  }

  return (
    <VideoView
      player={player}
      style={style ?? styles.video}
      nativeControls={nativeControls}
      contentFit="contain"
    />
  );
}

const styles = StyleSheet.create({
  video: { width: '100%', height: '100%' },
});
