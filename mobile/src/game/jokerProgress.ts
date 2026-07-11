export const PRACTICE_JOKERS = 2;
/** @deprecated Use PRACTICE_JOKERS */
export const PAIR_PRACTICE_JOKERS = PRACTICE_JOKERS;

export type JokerProgressResult = 'open' | 'correct' | 'joker' | 'incorrect';

export type SessionAnswer = {
  sequence: number;
  correct: boolean;
};

export function countWrongAnswers(
  answers: SessionAnswer[],
  pending?: SessionAnswer | null,
): number {
  let count = answers.filter((a) => !a.correct).length;
  if (pending && !pending.correct && !answers.some((a) => a.sequence === pending.sequence)) {
    count += 1;
  }
  return count;
}

export function remainingJokers(
  totalJokers: number,
  answers: SessionAnswer[],
  pending?: SessionAnswer | null,
): number {
  return Math.max(0, totalJokers - countWrongAnswers(answers, pending));
}

export function buildJokerProgressResults(
  levelLength: number,
  totalJokers: number,
  answers: SessionAnswer[],
  pending?: SessionAnswer | null,
): JokerProgressResult[] {
  const results: JokerProgressResult[] = Array.from({ length: levelLength }, () => 'open');
  const merged = [...answers];
  if (pending && !merged.some((a) => a.sequence === pending.sequence)) {
    merged.push(pending);
  }
  merged.forEach((a) => {
    const idx = a.sequence - 1;
    if (idx >= 0 && idx < levelLength) {
      results[idx] = a.correct ? 'correct' : 'incorrect';
    }
  });
  const incorrectIndices = results
    .map((r, i) => (r === 'incorrect' ? i : -1))
    .filter((i) => i >= 0);
  incorrectIndices.slice(0, totalJokers).forEach((idx) => {
    results[idx] = 'joker';
  });
  return results;
}

export function sessionAnswersFromGameScores(
  scores: Array<{ name?: string; answers?: Array<{ sequence?: number; correct?: boolean }> }> | undefined,
  playerName: string | undefined,
): SessionAnswer[] {
  const scoreRow = scores?.find((s) => s.name === playerName);
  return (scoreRow?.answers ?? [])
    .map((a) => ({
      sequence: Number(a.sequence ?? 0),
      correct: !!a.correct,
    }))
    .filter((a) => a.sequence > 0);
}
