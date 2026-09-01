import React from 'react';
import ReactPlayer from 'react-player';
import { isWikimediaVideoUrl, playVideoSources } from '../utils/play-video-url';

type PlayableVideoProps = {
  url: string;
  playing?: boolean;
  controls?: boolean;
  width?: string | number;
  height?: string | number;
  onReady?: () => void;
};

/**
 * Commons files: native &lt;video&gt; with WebM + QuickTime sources (Safari can skip a 404).
 * YouTube and other hosts keep ReactPlayer.
 */
export function PlayableVideo({
  url,
  playing = false,
  controls = true,
  width = '100%',
  height,
  onReady,
}: PlayableVideoProps) {
  if (isWikimediaVideoUrl(url)) {
    const sources = playVideoSources(url);
    return (
      <video
        controls={controls}
        autoPlay={playing}
        playsInline
        preload="metadata"
        width="100%"
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: height == null ? 'auto' : typeof height === 'number' ? `${height}px` : height,
          maxWidth: '100%',
          background: '#000',
        }}
        onLoadedData={onReady}
        onError={onReady}
      >
        {sources.map((source) => (
          <source key={source.src} src={source.src} type={source.type} />
        ))}
      </video>
    );
  }

  return (
    <ReactPlayer
      url={url}
      controls={controls}
      playing={playing}
      width={width}
      height={height ?? '50%'}
      onReady={onReady}
    />
  );
}
