import React from 'react';
import { StyleSheet, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { playVideoFallbackUrl, playVideoUrl } from '../utils/playVideoUrl';

type PlayableVideoProps = {
  uri: string;
  style?: StyleProp<ViewStyle>;
  autoPlay?: boolean;
  nativeControls?: boolean;
  onReady?: () => void;
};

export function PlayableVideo({
  uri,
  style,
  autoPlay = false,
  nativeControls = true,
  onReady,
}: PlayableVideoProps) {
  const [currentUri, setCurrentUri] = React.useState(() => playVideoUrl(uri, Platform.OS));
  const triedRef = React.useRef<Set<string>>(new Set([playVideoUrl(uri, Platform.OS)]));

  React.useEffect(() => {
    const next = playVideoUrl(uri, Platform.OS);
    triedRef.current = new Set([next]);
    setCurrentUri(next);
  }, [uri]);

  const skipReplaceRef = React.useRef(true);

  const player = useVideoPlayer(currentUri, (p) => {
    if (autoPlay) p.play();
  });

  React.useEffect(() => {
    if (skipReplaceRef.current) {
      skipReplaceRef.current = false;
      return;
    }
    player.replace(currentUri);
    if (autoPlay) player.play();
  }, [currentUri, player, autoPlay]);

  React.useEffect(() => {
    const sub = player.addListener('statusChange', ({ status }: { status: string }) => {
      if (status === 'readyToPlay') {
        onReady?.();
        return;
      }
      if (status !== 'error') return;
      const fallback = playVideoFallbackUrl(uri, currentUri, Platform.OS);
      if (fallback && !triedRef.current.has(fallback)) {
        triedRef.current.add(fallback);
        setCurrentUri(fallback);
        return;
      }
      onReady?.();
    });
    return () => sub.remove();
  }, [player, uri, currentUri, onReady]);

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
