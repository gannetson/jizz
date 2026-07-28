import {
  resolvePlayMediaType,
  mediaSlotIndexFromQuestion,
} from '../core/question-media-index';

describe('resolvePlayMediaType', () => {
  it('prefers question.media over game.media', () => {
    expect(
      resolvePlayMediaType({ media: 'audio', images: [], sounds: [] }, 'images')
    ).toBe('audio');
  });

  it('infers audio when only sounds are present (Club Mix Q11+)', () => {
    expect(
      resolvePlayMediaType(
        { images: [], videos: [], sounds: [{ url: 'https://x/a.mp3' }] },
        'images'
      )
    ).toBe('audio');
  });

  it('falls back to game media when arrays empty', () => {
    expect(resolvePlayMediaType({ images: [], sounds: [] }, 'video')).toBe('video');
  });
});

describe('mediaSlotIndexFromQuestion', () => {
  it('clamps to array bounds; play payloads use number 0', () => {
    expect(mediaSlotIndexFromQuestion({ number: 0 }, 1)).toBe(0);
    expect(mediaSlotIndexFromQuestion({ number: 11 }, 1)).toBe(0);
    expect(mediaSlotIndexFromQuestion({ number: null }, 3)).toBe(0);
  });
});
