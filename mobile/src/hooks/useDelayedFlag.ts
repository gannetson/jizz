import { useEffect, useState } from 'react';

/** Becomes true after `delayMs` while `active` stays true; resets when inactive. */
export function useDelayedFlag(active: boolean, delayMs = 2500): boolean {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!active) {
      setShown(false);
      return;
    }
    const timer = setTimeout(() => setShown(true), delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs]);

  return shown;
}
