import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronRight,
  Globe,
  Image as ImageIcon,
  Link2,
  Smile,
  Sparkles,
  Tag,
  Upload,
  X,
} from 'lucide-react';
import type { LinkItem, ThemePalette } from '../types/hub';
import {
  PROFILE_LOGO_MAX_CHARS,
  UPLOAD_IMAGE_MAX_PX,
  UPLOAD_IMAGE_QUALITY,
  extractHostname,
  formatLinkDecoration,
  getFaviconUrl,
  isImageSource,
  parseLinkDecoration,
} from '../utils/hubLogic';
import { resizeImageToDataUrl } from '../utils/imageResize';

interface LinkModalProps {
  open: boolean;
  editingLink: LinkItem | null;
  categories: string[];
  palette: ThemePalette;
  onSave: (link: Omit<LinkItem, 'id'> & { id?: string }) => void;
  onClose: () => void;
}

type IconMode = 'favicon' | 'upload' | 'imageUrl' | 'emoji';

const PRESET_EMOJIS = ['🔗', '🥞', '🥪', '🍮', '🎀', '🩵', '🧸', '🌸', '✨', '🛍️', '🎵', '📸'];

export const LinkModal: React.FC<LinkModalProps> = ({
  open,
  editingLink,
  categories,
  palette,
  onSave,
  onClose,
}) => {
  const initialParsed = editingLink
    ? parseLinkDecoration(editingLink.title, editingLink.subtitle || '')
    : { coreTitle: '', coreSubtitle: '', decorated: true };
  const initialIcon = editingLink ? editingLink.icon || '🔗' : '🎀';
  const initialMode: IconMode = editingLink
    ? initialIcon.startsWith('data:')
      ? 'upload'
      : initialIcon.includes('google.com/s2/favicons')
        ? 'favicon'
        : initialIcon.startsWith('http')
          ? 'imageUrl'
          : 'emoji'
    : 'emoji';

  const [title, setTitle] = useState(initialParsed.coreTitle);
  const [subtitle, setSubtitle] = useState(initialParsed.coreSubtitle);
  const [url, setUrl] = useState(editingLink?.url || '');
  const [category, setCategory] = useState(editingLink?.category || '');
  const [icon, setIcon] = useState(initialIcon);
  const iconRef = useRef<string>(initialIcon);
  const [iconMode, setIconMode] = useState<IconMode>(initialMode);
  const [autoDecorate, setAutoDecorate] = useState(initialParsed.decorated);
  const [error, setError] = useState('');
  const [resizing, setResizing] = useState(false);

  const updateIcon = (nextIcon: string) => {
    iconRef.current = nextIcon;
    setIcon(nextIcon);
  };

  useEffect(() => {
    if (open) {
      if (editingLink) {
        const parsed = parseLinkDecoration(editingLink.title, editingLink.subtitle || '');
        setTitle(parsed.coreTitle);
        setSubtitle(parsed.coreSubtitle);
        setAutoDecorate(parsed.decorated);
        setUrl(editingLink.url);
        setCategory(editingLink.category || '');
        const existingIcon = editingLink.icon || '🔗';
        updateIcon(existingIcon);
        if (existingIcon.startsWith('data:')) {
          setIconMode('upload');
        } else if (existingIcon.includes('google.com/s2/favicons')) {
          setIconMode('favicon');
        } else if (existingIcon.startsWith('http') || existingIcon.startsWith('/')) {
          setIconMode('imageUrl');
        } else {
          setIconMode('emoji');
        }
      } else {
        setTitle('');
        setSubtitle('');
        setUrl('');
        setCategory('');
        updateIcon('🎀');
        setIconMode('emoji');
        setAutoDecorate(true);
      }
      setError('');
    }
  }, [open, editingLink]);

  if (!open) return null;

  const handleUrlChange = (nextUrl: string) => {
    setUrl(nextUrl);
    if (iconMode === 'favicon') {
      const fav = getFaviconUrl(nextUrl);
      if (fav) updateIcon(fav);
    }
  };

  const handleSelectIconMode = (mode: IconMode) => {
    setIconMode(mode);
    setError('');
    if (mode === 'favicon') {
      const fav = getFaviconUrl(url);
      if (fav) updateIcon(fav);
    } else if (mode === 'emoji' && (iconRef.current.startsWith('data:') || iconRef.current.startsWith('http'))) {
      updateIcon('🎀');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setResizing(true);
    setError('');
    try {
      const dataUrl = await resizeImageToDataUrl(
        file,
        UPLOAD_IMAGE_MAX_PX,
        'jpeg',
        UPLOAD_IMAGE_QUALITY,
        PROFILE_LOGO_MAX_CHARS
      );
      updateIcon(dataUrl);
      setIconMode('upload');
    } catch {
      setError('ไม่สามารถอัปโหลดรูปภาพนี้ได้');
    } finally {
      setResizing(false);
    }
  };

  const handleSubmit = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (resizing) return;
    if (!url.trim()) {
      setError('กรุณาระบุ URL ปลายทาง');
      return;
    }
    if (!title.trim()) {
      setError('กรุณาระบุชื่อหัวข้อลิงก์');
      return;
    }

    const formatted = formatLinkDecoration(title, subtitle, autoDecorate);
    const latestIcon = iconRef.current.trim();
    const finalIcon =
      iconMode === 'favicon' ? getFaviconUrl(url) || latestIcon || '🔗' : latestIcon || '🔗';

    onSave({
      id: editingLink?.id,
      title: formatted.title,
      subtitle: formatted.subtitle,
      url: url.trim(),
      category: category.trim(),
      icon: finalIcon,
    });
  };

  const previewHost = extractHostname(url);
  const previewFormatted = formatLinkDecoration(
    title.trim() || 'ชื่อหัวข้อลิงก์',
    subtitle.trim() || 'คำอธิบายสั้นๆ ของลิงก์นี้',
    autoDecorate
  );
  const previewIcon = (iconMode === 'favicon' ? getFaviconUrl(url) || icon : icon).trim();
  const isImgIcon = isImageSource(previewIcon);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="link-modal-title"
    >
      <div
        className="max-h-[94vh] w-full max-w-[460px] overflow-y-auto rounded-3xl p-5 shadow-2xl"
        style={{
          backgroundColor: palette.cardBg,
          border: `1px solid ${palette.cardBorder}`,
          color: palette.text,
        }}
      >
        {/* Header */}
        <div
          className="mb-3 flex items-start justify-between gap-3 border-b pb-3"
          style={{ borderColor: palette.cardBorder }}
        >
          <div className="min-w-0">
            <h2 id="link-modal-title" className="text-lg font-bold leading-snug">
              {editingLink ? 'แก้ไขลิงก์' : 'เพิ่มลิงก์ใหม่'}
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed" style={{ color: palette.textMuted }}>
              วาง URL ระบบจะดึงโลโก้เว็บไซต์ให้อัตโนมัติ พร้อมปรับแต่งรูปและกรอบได้
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างลิงก์"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-80"
            style={{ backgroundColor: palette.accentSoft, color: palette.accent }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Live Preview */}
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold" style={{ color: palette.text }}>
                ตัวอย่างการ์ดแบบสด (Live Preview)
              </span>
              {previewHost && (
                <span
                  className="max-w-[165px] truncate font-medium"
                  style={{ color: palette.textMuted }}
                >
                  {previewHost}
                </span>
              )}
            </div>

            <div
              className="flex items-center gap-3 rounded-full px-3.5 py-2.5 shadow-sm"
              style={{
                backgroundColor: '#FFFFFF',
                border: `1px solid ${palette.cardBorder}`,
              }}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-xl"
                style={{
                  backgroundColor: palette.accentSoft,
                  border: `1.5px solid ${palette.cardBorder}`,
                }}
              >
                {isImgIcon ? (
                  <img
                    src={previewIcon}
                    alt="ตัวอย่างไอคอน"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{previewIcon || '🔗'}</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold" style={{ color: palette.text }}>
                  {previewFormatted.title}
                </p>
                <p className="truncate text-xs" style={{ color: palette.textMuted }}>
                  {previewFormatted.subtitle}
                </p>
              </div>

              <ChevronRight
                className="h-4 w-4 shrink-0"
                style={{ color: palette.accent }}
                aria-hidden="true"
              />
            </div>
          </div>

          {/* URL Field */}
          <div>
            <label
              htmlFor="link-url-input"
              className="mb-1.5 block text-xs font-semibold"
              style={{ color: palette.text }}
            >
              URL ปลายทาง *
            </label>
            <div className="relative">
              <Link2
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: palette.textMuted }}
                aria-hidden="true"
              />
              <input
                id="link-url-input"
                type="text"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-full py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: `1px solid ${palette.cardBorder}`,
                  color: palette.text,
                }}
              />
            </div>
          </div>

          {/* Icon Mode Tabs + Controls */}
          <div>
            <span className="mb-1.5 block text-xs font-semibold" style={{ color: palette.text }}>
              รูปไอคอนในกรอบวงกลม
            </span>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={iconMode === 'favicon'}
                onClick={() => handleSelectIconMode('favicon')}
                className="flex min-h-[38px] items-center justify-center gap-1 whitespace-nowrap rounded-xl px-2 text-xs font-semibold transition-all"
                style={{
                  backgroundColor: iconMode === 'favicon' ? palette.accent : '#FFFFFF',
                  color: iconMode === 'favicon' ? palette.accentText : palette.text,
                  border: `1px solid ${
                    iconMode === 'favicon' ? palette.accent : palette.cardBorder
                  }`,
                }}
              >
                <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>ดึงจากลิงก์</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={iconMode === 'upload'}
                onClick={() => handleSelectIconMode('upload')}
                className="flex min-h-[38px] items-center justify-center gap-1 whitespace-nowrap rounded-xl px-2 text-xs font-semibold transition-all"
                style={{
                  backgroundColor: iconMode === 'upload' ? palette.accent : '#FFFFFF',
                  color: iconMode === 'upload' ? palette.accentText : palette.text,
                  border: `1px solid ${
                    iconMode === 'upload' ? palette.accent : palette.cardBorder
                  }`,
                }}
              >
                <Upload className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>อัปโหลดรูป</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={iconMode === 'imageUrl'}
                onClick={() => handleSelectIconMode('imageUrl')}
                className="flex min-h-[38px] items-center justify-center gap-1 whitespace-nowrap rounded-xl px-2 text-xs font-semibold transition-all"
                style={{
                  backgroundColor: iconMode === 'imageUrl' ? palette.accent : '#FFFFFF',
                  color: iconMode === 'imageUrl' ? palette.accentText : palette.text,
                  border: `1px solid ${
                    iconMode === 'imageUrl' ? palette.accent : palette.cardBorder
                  }`,
                }}
              >
                <ImageIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>ลิงก์รูปภาพ</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={iconMode === 'emoji'}
                onClick={() => handleSelectIconMode('emoji')}
                className="flex min-h-[38px] items-center justify-center gap-1 whitespace-nowrap rounded-xl px-2 text-xs font-semibold transition-all"
                style={{
                  backgroundColor: iconMode === 'emoji' ? palette.accent : '#FFFFFF',
                  color: iconMode === 'emoji' ? palette.accentText : palette.text,
                  border: `1px solid ${
                    iconMode === 'emoji' ? palette.accent : palette.cardBorder
                  }`,
                }}
              >
                <Smile className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>เลือก Emoji</span>
              </button>
            </div>

            {iconMode === 'favicon' && (
              <div
                className="mt-2.5 flex items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5 text-xs"
                style={{
                  backgroundColor: palette.bg,
                  border: `1px solid ${palette.cardBorder}`,
                  color: palette.textMuted,
                }}
              >
                <span className="truncate">
                  {previewHost
                    ? `ดึงโลโก้จาก ${previewHost} อัตโนมัติแล้ว`
                    : 'วาง URL ด้านบนเพื่อดึงโลโก้อัตโนมัติ'}
                </span>
                {previewHost && (
                  <button
                    type="button"
                    onClick={() => updateIcon(getFaviconUrl(url))}
                    className="shrink-0 font-semibold underline"
                    style={{ color: palette.accent }}
                  >
                    ดึงใหม่
                  </button>
                )}
              </div>
            )}

            {iconMode === 'upload' && (
              <div className="mt-2.5 flex flex-wrap items-center gap-3">
                <label
                  className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-opacity hover:opacity-85"
                  style={{
                    backgroundColor: palette.accentSoft,
                    border: `1px solid ${palette.cardBorder}`,
                    color: palette.accent,
                  }}
                >
                  <Upload className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{resizing ? 'กำลังย่อขนาด...' : 'เลือกไฟล์รูปภาพ (140px JPEG)'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="sr-only"
                  />
                </label>
                {icon.startsWith('data:') && (
                  <span className="text-xs font-medium" style={{ color: palette.textMuted }}>
                    อัปโหลดรูปแล้ว
                  </span>
                )}
              </div>
            )}

            {iconMode === 'imageUrl' && (
              <div className="mt-2.5">
                <label htmlFor="link-image-url-input" className="sr-only">
                  ลิงก์รูปภาพ
                </label>
                <input
                  id="link-image-url-input"
                  type="url"
                  value={icon.startsWith('http') || icon.startsWith('/') ? icon : ''}
                  onChange={(e) => updateIcon(e.target.value)}
                  placeholder="วางลิงก์รูปภาพ https://..."
                  className="w-full rounded-full px-4 py-2 text-xs outline-none focus:ring-2"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: `1px solid ${palette.cardBorder}`,
                    color: palette.text,
                  }}
                />
              </div>
            )}

            {iconMode === 'emoji' && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {PRESET_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => updateIcon(emoji)}
                    aria-label={`เลือกไอคอน ${emoji}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-base transition-transform hover:scale-110"
                    style={{
                      backgroundColor: icon === emoji ? palette.accentSoft : '#FFFFFF',
                      border: `1px solid ${icon === emoji ? palette.accent : palette.cardBorder}`,
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="link-title-input"
              className="mb-1.5 block text-xs font-semibold"
              style={{ color: palette.text }}
            >
              ชื่อหัวข้อลิงก์ *
            </label>
            <input
              id="link-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น review finedaeivibe"
              className="w-full rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2"
              style={{
                backgroundColor: '#FFFFFF',
                border: `1px solid ${palette.cardBorder}`,
                color: palette.text,
              }}
            />
          </div>

          {/* Subtitle */}
          <div>
            <label
              htmlFor="link-subtitle-input"
              className="mb-1.5 block text-xs font-semibold"
              style={{ color: palette.text }}
            >
              คำอธิบายสั้นๆ
            </label>
            <input
              id="link-subtitle-input"
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="เช่น ดูรีวิวและสั่งซื้อสินค้าใหม่ล่าสุด"
              className="w-full rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2"
              style={{
                backgroundColor: '#FFFFFF',
                border: `1px solid ${palette.cardBorder}`,
                color: palette.text,
              }}
            />
          </div>

          {/* Free-text Category + Quick Chips */}
          <div>
            <label
              htmlFor="link-category-input"
              className="mb-1.5 block text-xs font-semibold"
              style={{ color: palette.text }}
            >
              หมวดหมู่ (ไม่บังคับ)
            </label>
            <div className="relative">
              <Tag
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: palette.textMuted }}
                aria-hidden="true"
              />
              <input
                id="link-category-input"
                type="text"
                list="link-category-suggestions"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="เช่น โซเชียล, ช้อปปิ้ง, ติดต่อสอบถาม, เกม"
                className="w-full rounded-full py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: `1px solid ${palette.cardBorder}`,
                  color: palette.text,
                }}
              />
            </div>
            <datalist id="link-category-suggestions">
              {categories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>

            {categories.length > 0 && (
              <div className="mt-2 space-y-1.5">
                <p className="text-[11px] font-medium" style={{ color: palette.textMuted }}>
                  เลือกด่วนจากหมวดหมู่ที่เคยสร้าง:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => {
                    const selected = category.trim() === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(selected ? '' : cat)}
                        aria-pressed={selected}
                        className="min-h-[30px] rounded-full px-3.5 py-1 text-xs font-semibold transition-all hover:opacity-85"
                        style={{
                          backgroundColor: selected ? palette.accent : palette.accentSoft,
                          color: selected ? palette.accentText : palette.accent,
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Auto Decorate Symbol Frame Option */}
          <label
            className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-3 transition-opacity hover:opacity-95"
            style={{
              backgroundColor: '#FFFFFF',
              border: `1px solid ${palette.cardBorder}`,
            }}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <Sparkles
                className="h-4 w-4 shrink-0"
                style={{ color: palette.accent }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className="text-xs font-bold" style={{ color: palette.text }}>
                  ตกแต่งกรอบสัญลักษณ์น่ารักอัตโนมัติ
                </div>
                <div className="text-[11px]" style={{ color: palette.textMuted }}>
                  เช่น ♡･ﾟ หัวข้อ ﾟ･♡ และ ~ ✿ คำอธิบาย ✿ ~
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={autoDecorate}
              onChange={(e) => setAutoDecorate(e.target.checked)}
              className="h-4.5 w-4.5 shrink-0 cursor-pointer accent-current"
              style={{ color: palette.accent }}
            />
          </label>

          {error && (
            <p role="alert" className="text-xs font-semibold text-red-600">
              {error}
            </p>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] whitespace-nowrap rounded-full px-5 py-2 text-xs font-semibold transition-opacity hover:opacity-85 sm:text-sm"
              style={{
                backgroundColor: '#FFFFFF',
                border: `1px solid ${palette.cardBorder}`,
                color: palette.text,
              }}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={resizing}
              className="min-h-[42px] whitespace-nowrap rounded-full px-6 py-2 text-xs font-semibold transition-transform active:scale-95 disabled:opacity-60 sm:text-sm"
              style={{ backgroundColor: palette.accent, color: palette.accentText }}
            >
              {resizing ? 'กำลังย่อรูป...' : editingLink ? 'บันทึกการแก้ไข' : 'เพิ่มลิงก์'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
