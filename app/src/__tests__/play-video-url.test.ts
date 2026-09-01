import { playVideoSources, wikimediaVideoVariants } from '../utils/play-video-url';

describe('wikimedia video playback URLs', () => {
  const original =
    'https://upload.wikimedia.org/wikipedia/commons/e/e6/Huiszwaluw_zittend_op_schapenhek-4961660.webm';
  const ogv = 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Pinicola_enucleator_CT2.ogv';

  it('builds 480p webm and 360p mov from the original path', () => {
    const v = wikimediaVideoVariants(original);
    expect(v?.webm480).toContain('.480p.vp9.webm');
    expect(v?.mov360).toContain('.360p.mpeg4.mov');
    expect(v?.original).toBe(original);
  });

  it('still finds mov when the API already returned 480p webm', () => {
    const transcoded = wikimediaVideoVariants(original)!.webm480;
    expect(wikimediaVideoVariants(transcoded)?.mov360).toBe(
      wikimediaVideoVariants(original)!.mov360,
    );
    expect(wikimediaVideoVariants(transcoded)?.original).toBe(original);
  });

  it('puts mov first when preferMov, webm first otherwise', () => {
    const safari = playVideoSources(ogv, true);
    const chrome = playVideoSources(ogv, false);
    expect(safari[0].src).toContain('.360p.mpeg4.mov');
    expect(safari[0].type).toBe('video/quicktime');
    expect(chrome[0].src).toContain('.480p.vp9.webm');
    expect(chrome[0].type).toBe('video/webm');
  });

  it('leaves youtube unchanged', () => {
    const yt = 'https://www.youtube.com/watch?v=abc';
    expect(wikimediaVideoVariants(yt)).toBeNull();
    expect(playVideoSources(yt)).toEqual([{ src: yt }]);
  });
});
