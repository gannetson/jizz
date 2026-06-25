import { useEffect, useRef, useState } from 'react';

type Options = {
  speedSeconds: number | null | undefined;
  active: boolean;
  questionId: number | null | undefined;
  onExpire: () => void;
};

export function useSpeedChallengeTimer({
  speedSeconds,
  active,
  questionId,
  onExpire,
}: Options) {
  const [progress, setProgress] = useState(0);
  const [expired, setExpired] = useState(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    setProgress(0);
    setExpired(false);
  }, [questionId, speedSeconds]);

  useEffect(() => {
    if (!speedSeconds || speedSeconds <= 0 || !active || expired) {
      return;
    }

    const startedAt = Date.now();
    const durationMs = speedSeconds * 1000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextProgress = Math.min(100, (elapsed / durationMs) * 100);
      setProgress(nextProgress);
      if (elapsed >= durationMs) {
        clearInterval(interval);
        setExpired(true);
        onExpireRef.current();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [speedSeconds, active, expired, questionId]);

  return { progress, expired };
};
