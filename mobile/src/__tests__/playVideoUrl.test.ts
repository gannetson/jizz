import { playVideoFallbackUrl, playVideoUrl, wikimediaVideoVariants } from '../utils/playVideoUrl';

describe('playVideoUrl', () => {
  const original =
    'https://upload.wikimedia.org/wikipedia/commons/e/e6/Huiszwaluw_zittend_op_schapenhek-4961660.webm';

  it('uses 360p mov on iOS and 480p webm on Android', () => {
    expect(playVideoUrl(original, 'ios')).toContain('.360p.mpeg4.mov');
    expect(playVideoUrl(original, 'android')).toContain('.480p.vp9.webm');
  });

  it('falls back from mov to webm on iOS', () => {
    const mov = playVideoUrl(original, 'ios');
    const next = playVideoFallbackUrl(original, mov, 'ios');
    expect(next).toContain('.480p.vp9.webm');
    expect(playVideoFallbackUrl(original, next!, 'ios')).toBe(original);
  });

  it('parses 480p API URLs back to the same mov', () => {
    const webm = wikimediaVideoVariants(original)!.webm480;
    expect(playVideoUrl(webm, 'ios')).toBe(playVideoUrl(original, 'ios'));
  });
});
