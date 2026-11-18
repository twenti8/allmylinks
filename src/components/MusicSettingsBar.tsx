import React, { useEffect, useState } from 'react';
import { ImagePlus, Music, Save, Trash2 } from 'lucide-react';
import type { MusicConfig, ThemePalette } from '../types/hub';
import { resizeImageToDataUrl } from '../utils/imageResize';

interface MusicSettingsBarProps {
  config: MusicConfig;
  palette: ThemePalette;
  onSaveMusic: (updated: MusicConfig) => void;
}

export const MusicSettingsBar: React.FC<MusicSettingsBarProps> = ({
  config,
  palette,
  onSaveMusic,
}) => {
  const [enabled, setEnabled] = useState(config.enabled);
  const [youtubeUrl, setYoutubeUrl] = useState(config.youtubeUrl);
  const [title, setTitle] = useState(config.title);
  const [artist, setArtist] = useState(config.artist);
  const [coverImage, setCoverImage] = useState(config.coverImage);
  const [autoplay, setAutoplay] = useState(config.autoplay);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setEnabled(config.enabled);
    setYoutubeUrl(config.youtubeUrl);
    setTitle(config.title);
    setArtist(config.artist);
    setCoverImage(config.coverImage);
    setAutoplay(config.autoplay);
  }, [config]);

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const resized = await resizeImageToDataUrl(file, 300);
      setCoverImage(resized);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveMusic({
      ...config,
      enabled,
      youtubeUrl: youtubeUrl.trim(),
      title: title.trim() || 'เพลงโปรด',
      artist: artist.trim(),
      coverImage: coverImage.trim(),
      autoplay,
    });
  };

  return (
    <section
      aria-label="บาร์ตั้งค่าเพลง"
      className="mt-4 w-full rounded-3xl p-4 sm:p-5"
      style={{
        backgroundColor: palette.cardBg,
        border: `1px solid ${palette.cardBorder}`,
        boxShadow: palette.cardShadow,
        color: palette.text,
      }}
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Music className="h-4 w-4 shrink-0" style={{ color: palette.accent }} aria-hidden="true" />
            <span>บาร์ตั้งค่าเพลง</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 accent-current"
                style={{ color: palette.accent }}
              />
              <span>แสดงเครื่องเล่นเพลง</span>
            </label>

            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={autoplay}
                onChange={(e) => setAutoplay(e.target.checked)}
                className="h-4 w-4 accent-current"
                style={{ color: palette.accent }}
              />
              <span>เล่นอัตโนมัติ</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="bar-music-yt-url"
              className="mb-1 block text-xs font-semibold"
              style={{ color: palette.textMuted }}
            >
              ลิงก์ YouTube
            </label>
            <input
              id="bar-music-yt-url"
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="min-h-[42px] w-full rounded-2xl px-3.5 text-xs outline-none focus:ring-2 sm:text-sm"
              style={{
                backgroundColor: palette.bg,
                border: `1px solid ${palette.cardBorder}`,
                color: palette.text,
              }}
            />
          </div>

          <div>
            <label
              htmlFor="bar-music-title"
              className="mb-1 block text-xs font-semibold"
              style={{ color: palette.textMuted }}
            >
              ชื่อเพลง
            </label>
            <input
              id="bar-music-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ชื่อเพลงที่ต้องการแสดง..."
              className="min-h-[42px] w-full rounded-2xl px-3.5 text-xs outline-none focus:ring-2 sm:text-sm"
              style={{
                backgroundColor: palette.bg,
                border: `1px solid ${palette.cardBorder}`,
                color: palette.text,
              }}
            />
          </div>
        </div>

        {/* Cover Image + Artist + Save Row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex items-center gap-2.5 sm:flex-1">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl"
              style={{
                backgroundColor: palette.accentSoft,
                border: `1px solid ${palette.cardBorder}`,
              }}
            >
              {coverImage ? (
                <img src={coverImage} alt="รูปปกเพลง" className="h-full w-full object-cover" />
              ) : (
                <Music className="h-4 w-4" style={{ color: palette.accent }} aria-hidden="true" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <label
                htmlFor="bar-music-cover-url"
                className="mb-1 block text-xs font-semibold"
                style={{ color: palette.textMuted }}
              >
                รูปปกเพลง (อัปโหลดหรือวางลิงก์)
              </label>
              <input
                id="bar-music-cover-url"
                type="text"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="URL รูปปก (หรือกดอัปโหลดด้านขวา)"
                className="min-h-[42px] w-full min-w-0 rounded-2xl px-3.5 text-xs outline-none focus:ring-2"
                style={{
                  backgroundColor: palette.bg,
                  border: `1px solid ${palette.cardBorder}`,
                  color: palette.text,
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label
              className="inline-flex min-h-[42px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-xs font-semibold transition-opacity hover:opacity-85"
              style={{ backgroundColor: palette.bgSoft, color: palette.text }}
            >
              <ImagePlus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {uploading ? 'กำลังย่อ...' : 'อัปโหลดรูปปก'}
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadCover}
                className="sr-only"
              />
            </label>

            {coverImage && (
              <button
                type="button"
                onClick={() => setCoverImage('')}
                aria-label="ลบรูปปกเพลง"
                className="flex min-h-[42px] items-center gap-1 whitespace-nowrap rounded-full bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                ลบรูปปก
              </button>
            )}

            <button
              type="submit"
              className="flex min-h-[42px] items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-xs font-semibold transition-transform active:scale-95"
              style={{ backgroundColor: palette.accent, color: palette.accentText }}
            >
              <Save className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              บันทึกเพลง
            </button>
          </div>
        </div>
      </form>
    </section>
  );
};
