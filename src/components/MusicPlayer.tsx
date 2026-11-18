import React, { useEffect, useRef, useState } from 'react';
import {
  Maximize2,
  Minimize2,
  Music,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { MusicConfig, ThemePalette } from '../types/hub';
import { extractYouTubeId } from '../utils/hubLogic';

interface MusicPlayerProps {
  config: MusicConfig;
  palette: ThemePalette;
  onUpdateConfig: (partial: Partial<MusicConfig>) => void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        options: {
          height?: string | number;
          width?: string | number;
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (event: { target: YTPlayerInstance }) => void;
            onStateChange?: (event: { data: number }) => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState?: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  setVolume: (vol: number) => void;
  mute: () => void;
  unMute: () => void;
  loadVideoById: (id: string) => void;
  destroy: () => void;
}

let ytApiPromise: Promise<void> | null = null;

function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    const existing = document.getElementById('yt-iframe-api-script');
    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevCallback) prevCallback();
      resolve();
    };
    if (!existing) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => resolve(); // Fail gracefully offline
      document.head.appendChild(tag);
    }
    // Safety timeout in offline/restricted environments
    setTimeout(resolve, 2500);
  });

  return ytApiPromise;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({
  config,
  palette,
  onUpdateConfig,
}) => {
  const videoId = extractYouTubeId(config.youtubeUrl);
  const [isPlaying, setIsPlaying] = useState(config.autoplay);
  const [muted, setMuted] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const lastVideoIdRef = useRef<string | null>(null);

  useEffect(() => {
    setCoverFailed(false);
  }, [config.coverImage, videoId]);

  useEffect(() => {
    if (!config.enabled || !videoId) return;

    let cancelled = false;
    loadYouTubeIframeApi().then(() => {
      if (cancelled || !playerContainerRef.current || !window.YT || !window.YT.Player) return;

      if (playerRef.current && lastVideoIdRef.current === videoId) {
        return;
      }

      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // Ignore destroy errors
        }
        playerRef.current = null;
      }

      lastVideoIdRef.current = videoId;
      const mountEl = document.createElement('div');
      playerContainerRef.current.innerHTML = '';
      playerContainerRef.current.appendChild(mountEl);

      playerRef.current = new window.YT.Player(mountEl, {
        height: '180',
        width: '100%',
        videoId,
        playerVars: {
          autoplay: config.autoplay ? 1 : 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          loop: 1,
          playlist: videoId,
        },
        events: {
          onReady: (ev) => {
            ev.target.setVolume(config.volume);
            if (muted) ev.target.mute();
            if (config.autoplay) {
              ev.target.playVideo();
            }
          },
          onStateChange: (ev) => {
            if (ev.data === 1) setIsPlaying(true);
            if (ev.data === 2 || ev.data === 0) setIsPlaying(false);
          },
        },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [config.enabled, videoId]);

  useEffect(() => {
    if (playerRef.current) {
      try {
        playerRef.current.setVolume(config.volume);
      } catch {
        // Player not ready yet
      }
    }
  }, [config.volume]);

  if (!config.enabled || !videoId) return null;

  const togglePlay = () => {
    const next = !isPlaying;
    setIsPlaying(next);
    if (playerRef.current) {
      try {
        if (next) playerRef.current.playVideo();
        else playerRef.current.pauseVideo();
      } catch {
        // Ignore if YT player hasn't mounted
      }
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (playerRef.current) {
      try {
        if (next) playerRef.current.mute();
        else playerRef.current.unMute();
      } catch {
        // Ignore
      }
    }
  };

  const isCompact = config.compactMode;
  const coverSrc =
    !coverFailed && (config.coverImage || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : ''));

  return (
    <section
      aria-label="เครื่องเล่นเพลง YouTube"
      className="mx-auto w-full transition-all duration-200"
      style={{
        backgroundColor: palette.cardBg,
        border: `1px solid ${palette.cardBorder}`,
        boxShadow: palette.cardShadow,
        borderRadius: isCompact ? '999px' : '24px',
      }}
    >
      {/* Minimal Public Control Row: Play/Pause, Cover & Title, Volume, Compact/Full */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 sm:gap-3">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'หยุดเพลงชั่วคราว' : 'เล่นเพลง'}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
          style={{ backgroundColor: palette.accent, color: palette.accentText }}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 fill-current" />
          ) : (
            <Play className="ml-0.5 h-4 w-4 fill-current" />
          )}
        </button>

        {/* Cover Thumbnail */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full"
          style={{
            backgroundColor: palette.accentSoft,
            border: `1px solid ${palette.cardBorder}`,
          }}
        >
          {coverSrc ? (
            <img
              src={coverSrc}
              alt={config.title || 'ปกเพลง'}
              referrerPolicy="no-referrer"
              onError={() => setCoverFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <Music className="h-4 w-4" style={{ color: palette.accent }} aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-xs font-bold sm:text-sm" style={{ color: palette.text }}>
            {config.title || 'เพลงโปรด'}
          </p>
          {config.artist && (
            <p className="truncate text-[11px]" style={{ color: palette.textMuted }}>
              {config.artist}
            </p>
          )}
        </div>

        {/* Inline Volume Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? 'เปิดเสียงเพลง' : 'ปิดเสียงเพลง'}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-opacity hover:opacity-75"
            style={{ color: palette.textMuted }}
          >
            {muted || config.volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          <label htmlFor="player-volume-compact" className="sr-only">
            ระดับเสียงเพลง
          </label>
          <input
            id="player-volume-compact"
            type="range"
            min={0}
            max={100}
            value={muted ? 0 : config.volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (muted && v > 0) setMuted(false);
              onUpdateConfig({ volume: v });
            }}
            className="hidden h-1.5 w-16 cursor-pointer accent-current sm:block"
            style={{ color: palette.accent }}
          />
        </div>

        {/* Expand / Compact Mode Switch */}
        <button
          type="button"
          onClick={() => onUpdateConfig({ compactMode: !config.compactMode })}
          aria-label={isCompact ? 'ขยายเครื่องเล่นเพลงแบบเต็ม' : 'ย่อเครื่องเล่นเพลงแบบกะทัดรัด'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:opacity-80"
          style={{
            backgroundColor: palette.bgSoft,
            color: palette.text,
          }}
        >
          {isCompact ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Expanded Body + Hidden/Visible YouTube IFrame Container */}
      <div className={isCompact ? 'sr-only' : 'px-4 pb-4 pt-1'}>
        <div
          ref={playerContainerRef}
          className="overflow-hidden rounded-2xl bg-black/5"
          style={{ minHeight: isCompact ? 0 : 180 }}
        />

        {/* Mobile volume bar inside expanded mode */}
        <div className="mt-3 flex items-center justify-between gap-3 sm:hidden">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? 'เปิดเสียงเพลง' : 'ปิดเสียงเพลง'}
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: palette.bgSoft, color: palette.text }}
          >
            {muted || config.volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          <label htmlFor="player-volume-mobile" className="sr-only">
            ระดับเสียง
          </label>
          <input
            id="player-volume-mobile"
            type="range"
            min={0}
            max={100}
            value={muted ? 0 : config.volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (muted && v > 0) setMuted(false);
              onUpdateConfig({ volume: v });
            }}
            className="h-1.5 flex-1 cursor-pointer accent-current"
            style={{ color: palette.accent }}
          />
          <span className="w-10 text-right text-xs font-semibold tabular-nums" style={{ color: palette.textMuted }}>
            {muted ? 0 : config.volume}%
          </span>
        </div>
      </div>
    </section>
  );
};
