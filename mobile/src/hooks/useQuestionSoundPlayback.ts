import { useCallback, useEffect } from 'react';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { usePulsatingAnimation } from './usePulsatingAnimation';

/** Auto-play question sound; tap toggles play/pause. */
export function useQuestionSoundPlayback(soundUri: string | null, resetKey?: number | string) {
  const audioPlayer = useAudioPlayer(soundUri ?? null);
  const audioStatus = useAudioPlayerStatus(audioPlayer);
  const soundPlaying = audioStatus.playing;
  const pulsatingStyle = usePulsatingAnimation(soundPlaying);

  useEffect(() => {
    if (!soundUri) return;
    setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
      shouldPlayInBackground: false,
      interruptionMode: 'duckOthers',
    }).catch(() => {});
  }, [soundUri]);

  useEffect(() => {
    if (!soundUri) return;
    audioPlayer.play();
  }, [soundUri, resetKey, audioPlayer]);

  const toggleSound = useCallback(() => {
    if (!soundUri) return;
    if (audioStatus.playing) {
      audioPlayer.pause();
    } else {
      audioPlayer.play();
    }
  }, [soundUri, audioPlayer, audioStatus.playing]);

  return { toggleSound, soundPlaying, pulsatingStyle };
}
