import {
  formatChallengeCountdown,
  getChallengeTimeRemaining,
} from '../core/challenge-countdown';

describe('challenge countdown', () => {
  it('returns null when ended or invalid', () => {
    expect(getChallengeTimeRemaining(null)).toBeNull();
    expect(getChallengeTimeRemaining('not-a-date')).toBeNull();
    const now = new Date('2026-07-27T12:00:00Z');
    expect(getChallengeTimeRemaining('2026-07-27T11:00:00Z', now)).toBeNull();
  });

  it('breaks remaining time into days/hours/minutes/seconds', () => {
    const now = new Date('2026-07-27T12:00:00Z');
    const ends = new Date('2026-07-29T17:34:56Z'); // 2d 5h 34m 56s
    const parts = getChallengeTimeRemaining(ends, now);
    expect(parts).toEqual({
      days: 2,
      hours: 5,
      minutes: 34,
      seconds: 56,
      totalSeconds: 2 * 86400 + 5 * 3600 + 34 * 60 + 56,
    });
    expect(formatChallengeCountdown(parts!)).toBe('2d 05:34:56');
  });

  it('omits day prefix under 24 hours', () => {
    const now = new Date('2026-07-27T12:00:00Z');
    const parts = getChallengeTimeRemaining('2026-07-27T14:05:09Z', now);
    expect(parts?.days).toBe(0);
    expect(formatChallengeCountdown(parts!)).toBe('02:05:09');
  });
});
