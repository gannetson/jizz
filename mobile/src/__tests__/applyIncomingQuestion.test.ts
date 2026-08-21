import { isStalePlayQuestion } from '../game/applyIncomingQuestion';

describe('isStalePlayQuestion', () => {
  it('accepts the first question when nothing is on screen', () => {
    expect(isStalePlayQuestion(undefined, { id: 10, sequence: 1 })).toBe(false);
  });

  it('rejects a missing incoming question', () => {
    expect(isStalePlayQuestion({ id: 10, sequence: 1 }, undefined)).toBe(true);
    expect(isStalePlayQuestion({ id: 10, sequence: 1 }, { id: 0, sequence: 1 })).toBe(true);
  });

  it('accepts the same question again (reconnect / refresh)', () => {
    expect(isStalePlayQuestion({ id: 10, sequence: 2 }, { id: 10, sequence: 2 })).toBe(false);
  });

  it('rejects an older sequence after the client already advanced', () => {
    expect(isStalePlayQuestion({ id: 20, sequence: 6 }, { id: 10, sequence: 5 })).toBe(true);
  });

  it('accepts a newer sequence', () => {
    expect(isStalePlayQuestion({ id: 10, sequence: 5 }, { id: 20, sequence: 6 })).toBe(false);
  });

  it('rejects a different id at the same sequence', () => {
    expect(isStalePlayQuestion({ id: 10, sequence: 3 }, { id: 11, sequence: 3 })).toBe(true);
  });

  it('falls back to id order when sequence is missing', () => {
    expect(isStalePlayQuestion({ id: 20 }, { id: 10 })).toBe(true);
    expect(isStalePlayQuestion({ id: 10 }, { id: 20 })).toBe(false);
  });
});
