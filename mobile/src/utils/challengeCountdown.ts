/** Live countdown helpers for flock challenge home CTA. */

export type ChallengeTimeRemaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
};

export function getChallengeTimeRemaining(
  endsAt: string | Date | null | undefined,
  now: Date = new Date()
): ChallengeTimeRemaining | null {
  if (!endsAt) return null;
  const endMs = typeof endsAt === 'string' ? Date.parse(endsAt) : endsAt.getTime();
  if (!Number.isFinite(endMs)) return null;
  const totalSeconds = Math.floor((endMs - now.getTime()) / 1000);
  if (totalSeconds <= 0) return null;
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, totalSeconds };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Compact clock: `2d 05:12:03` or `05:12:03` when under a day. */
export function formatChallengeCountdown(parts: ChallengeTimeRemaining): string {
  const clock = `${pad2(parts.hours)}:${pad2(parts.minutes)}:${pad2(parts.seconds)}`;
  if (parts.days > 0) return `${parts.days}d ${clock}`;
  return clock;
}
