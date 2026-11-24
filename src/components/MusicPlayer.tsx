import React, { useEffect, useRef, useState } from 'react';
import {
  Music,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { MusicConfig, ThemePalette } from '../types/hub';
import {
  computeProgressPercent,
  extractYouTubeId,
  formatPlaybackTime,
  isImageSource,
} from '../utils/hubLogic';

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
            onStateChange?: (event: { data: number; target?: YTPlayerInstance }) => void;
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
  getCurrentTime?: () => number;
  getDuration?: () => number;
  seekTo?: (seconds: number, allowSeekAhead: boolean) => void;
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
      tag.onerror = () => resolve();
      document.head.appendChild(tag);
    }
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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const lastVideoIdRef = useRef<string | null>(null);
  const isSeekingRef = useRef(false);
  const seekLockUntilRef = useRef(0);

  useEffect(() => {
    setCoverFailed(false);
  }, [config.coverImage]);

  useEffect(() => {
    setCoverFailed(false);
    setCurrentTime(0);
    setDuration(0);
  }, [videoId]);

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
        height: '200',
        width: '200',
        videoId,
        playerVars: {
          autoplay: config.autoplay ? 1 : 0,
          controls: 0,
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
            const total = ev.target.getDuration?.() ?? 0;
            const current = ev.target.getCurrentTime?.() ?? 0;
            if (Number.isFinite(total) && total > 0) setDuration(total);
            if (Number.isFinite(current) && current >= 0) setCurrentTime(current);
            if (config.autoplay) {
              ev.target.playVideo();
            }
          },
          onStateChange: (ev) => {
            if (ev.data === 1) setIsPlaying(true);
            if (ev.data === 2 || ev.data === 0) setIsPlaying(false);
            const target = ev.target ?? playerRef.current;
            if (target) {
              const total = target.getDuration?.() ?? 0;
              if (Number.isFinite(total) && total > 0) setDuration(total);
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [config.enabled, videoId]);

  // Poll live YouTube playback position and total duration
  useEffect(() => {
    if (!config.enabled || !videoId) return;

    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player || isSeekingRef.current || Date.now() < seekLockUntilRef.current) return;
      try {
        const total = player.getDuration?.() ?? 0;
        const current = player.getCurrentTime?.() ?? 0;
        if (Number.isFinite(total) && total > 0) {
          setDuration(total);
        }
        if (Number.isFinite(current) && current >= 0) {
          setCurrentTime(total > 0 ? Math.min(current, total) : current);
        }
      } catch {
        // Ignore transient YT player read errors
      }
    }, 300);

    return () => window.clearInterval(timer);
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

  const handleSeekChange = (nextSeconds: number) => {
    const clamped = duration > 0 ? Math.min(duration, Math.max(0, nextSeconds)) : 0;
    setCurrentTime(clamped);
    seekLockUntilRef.current = Date.now() + 450;
    if (playerRef.current?.seekTo && duration > 0) {
      try {
        playerRef.current.seekTo(clamped, true);
      } catch {
        // Ignore seek errors before player ready
      }
    }
  };

  const progressPercent = computeProgressPercent(currentTime, duration);
  const customCover = isImageSource(config.coverImage) ? config.coverImage.trim() : '';
  const coverSrc =
    !coverFailed &&
    (customCover || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : ''));

  return (
    <section
      aria-label="เครื่องเล่นเพลง YouTube"
      className="relative mx-auto w-full rounded-3xl px-4 py-3 transition-colors duration-200"
      style={{
        backgroundColor: palette.cardBg,
        border: `1px solid ${palette.cardBorder}`,
        boxShadow: palette.cardShadow,
      }}
    >
      {/* Hidden YouTube IFrame audio engine (always compact bar mode) */}
      <div
        ref={playerContainerRef}
        aria-hidden="true"
        className="pointer-events-none fixed -left-[9999px] top-0 h-[200px] w-[200px] opacity-0"
      />

      {/* Compact Control Row: Play/Pause, Cover & Title, Volume */}
      <div className="flex items-center gap-2.5 sm:gap-3">
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

        <div className="flex items-center gap-1.5">
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
      </div>

      {/* Real-time Seekable Playback Progress Bar */}
      <div className="mt-2.5 flex items-center gap-2.5">
        <span
          className="min-w-[34px] text-left text-[11px] font-medium tabular-nums"
          style={{ color: palette.textMuted }}
        >
          {formatPlaybackTime(currentTime)}
        </span>

        <div className="group relative flex h-5 flex-1 items-center">
          <div
            className="relative h-1.5 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: palette.bgSoft }}
          >
            <div
              className="h-full rounded-full transition-[width] duration-150"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: palette.accent,
              }}
            />
          </div>
          {duration > 0 && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-sm transition-transform group-hover:scale-110"
              style={{
                left: `${progressPercent}%`,
                backgroundColor: palette.accent,
                border: `2px solid ${palette.cardBg}`,
              }}
            />
          )}
          <label htmlFor="player-progress-bar" className="sr-only">
            ความคืบหน้าของเพลง
          </label>
          <input
            id="player-progress-bar"
            type="range"
            min={0}
            max={duration > 0 ? duration : 100}
            step={0.1}
            value={duration > 0 ? currentTime : 0}
            disabled={duration <= 0}
            aria-label="ความคืบหน้าของเพลง"
            aria-valuemin={0}
            aria-valuemax={duration > 0 ? Math.floor(duration) : 0}
            aria-valuenow={Math.floor(currentTime)}
            aria-valuetext={`${formatPlaybackTime(currentTime)} จาก ${formatPlaybackTime(duration)}`}
            onPointerDown={() => {
              isSeekingRef.current = true;
            }}
            onPointerUp={() => {
              isSeekingRef.current = false;
            }}
            onBlur={() => {
              isSeekingRef.current = false;
            }}
            onChange={(e) => {
              handleSeekChange(Number(e.target.value));
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
          />
        </div>

        <span
          className="min-w-[34px] text-right text-[11px] font-medium tabular-nums"
          style={{ color: palette.textMuted }}
        >
          {formatPlaybackTime(duration)}
        </span>
      </div>
    </section>
  );
};
