import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, Upload, X } from 'lucide-react';
import type { HubData, ThemePalette } from '../types/hub';
import {
  DEFAULT_AVATAR_SVG,
  PROFILE_FRAME_STYLES,
  PROFILE_LOGO_MAX_CHARS,
  UPLOAD_IMAGE_MAX_PX,
  UPLOAD_IMAGE_QUALITY,
  type ProfileFrameId,
  extractUniqueCategories,
  formatProfileFrame,
  parseProfileFrame,
} from '../utils/hubLogic';
import { resizeImageToDataUrl } from '../utils/imageResize';

interface ProfileEditorModalProps {
  open: boolean;
  data: HubData;
  palette: ThemePalette;
  onSave: (updated: Partial<HubData>) => void;
  onClose: () => void;
}

export const ProfileEditorModal: React.FC<ProfileEditorModalProps> = ({
  open,
  data,
  palette,
  onSave,
  onClose,
}) => {
  const initialParsed = parseProfileFrame(data.profileName);
  const [coreName, setCoreName] = useState(initialParsed.coreName);
  const [frameId, setFrameId] = useState<ProfileFrameId>(initialParsed.frameId);
  const [profileBio, setProfileBio] = useState(data.profileBio || '');
  const [profileImage, setProfileImage] = useState(data.profileImage || DEFAULT_AVATAR_SVG);
  const profileImageRef = useRef<string>(data.profileImage || DEFAULT_AVATAR_SVG);
  const wasOpenRef = useRef<boolean>(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      const parsed = parseProfileFrame(data.profileName);
      const initialImg = data.profileImage || DEFAULT_AVATAR_SVG;
      setCoreName(parsed.coreName);
      setFrameId(parsed.frameId);
      setProfileBio(data.profileBio || '');
      setProfileImage(initialImg);
      profileImageRef.current = initialImg;
      setError('');
    }
    wasOpenRef.current = open;
  }, [open, data]);

  if (!open) return null;

  const isDataUri = profileImage.startsWith('data:');

  const updateProfileImage = (nextImg: string) => {
    profileImageRef.current = nextImg;
    setProfileImage(nextImg);
  };

  const handleUploadProfileImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const resized = await resizeImageToDataUrl(
        file,
        UPLOAD_IMAGE_MAX_PX,
        'jpeg',
        UPLOAD_IMAGE_QUALITY,
        PROFILE_LOGO_MAX_CHARS
      );
      updateProfileImage(resized);
    } catch {
      setError('ไม่สามารถอัปโหลดรูปโลโก้ได้');
    } finally {
      setUploading(false);
    }
  };

  const handleResetLogo = () => {
    updateProfileImage(DEFAULT_AVATAR_SVG);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) return;
    const cleanedCore = coreName.trim();
    if (!cleanedCore) {
      setError('กรุณากรอกชื่อร้านหรือหัวข้อหลักของเว็บ');
      return;
    }

    const formattedName = formatProfileFrame(cleanedCore, frameId);
    const finalImage = profileImageRef.current.trim() || DEFAULT_AVATAR_SVG;

    onSave({
      profileName: formattedName,
      profileBio: profileBio.trim(),
      profileImage: finalImage,
      categories: extractUniqueCategories(data.links),
      iosConfig: {
        appName: cleanedCore,
        appIcon: finalImage,
      },
    });
  };

  const previewSample = coreName.trim() || 'moogrob';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-editor-title"
    >
      <div
        className="max-h-[92vh] w-full max-w-[460px] overflow-y-auto rounded-3xl p-6 shadow-2xl"
        style={{
          backgroundColor: palette.cardBg,
          border: `1px solid ${palette.cardBorder}`,
          color: palette.text,
        }}
      >
        {/* Header */}
        <div
          className="mb-5 flex items-start justify-between gap-3 border-b pb-4"
          style={{ borderColor: palette.cardBorder }}
        >
          <div className="min-w-0">
            <h2 id="profile-editor-title" className="text-lg font-bold leading-snug">
              แก้ไขข้อมูลร้าน / หัวข้อเว็บ
            </h2>
            <p className="mt-0.5 text-xs" style={{ color: palette.textMuted }}>
              ชื่อร้านจะถูกอัปเดตไปยังชื่อแท็บเบราว์เซอร์โดยอัตโนมัติ
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างแก้ไขโปรไฟล์"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-80"
            style={{ backgroundColor: palette.accentSoft, color: palette.accent }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Logo Circle + Upload / Reset + Explicit Image URL Input */}
          <div className="space-y-3">
            <div className="flex items-center gap-3.5">
              <div
                className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-white p-0.5 shadow-sm"
                style={{ border: `2.5px solid ${palette.accent}` }}
              >
                <img
                  src={profileImage || DEFAULT_AVATAR_SVG}
                  alt="ตัวอย่างรูปโลโก้"
                  referrerPolicy="no-referrer"
                  className="h-full w-full rounded-full object-cover"
                />
              </div>

              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    className="inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-opacity hover:opacity-85"
                    style={{ backgroundColor: palette.accentSoft, color: palette.accent }}
                  >
                    <Upload className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{uploading ? 'กำลังย่อขนาด...' : 'อัปโหลดรูปจากเครื่อง'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadProfileImg}
                      className="sr-only"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleResetLogo}
                    className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-opacity hover:opacity-85"
                    style={{
                      backgroundColor: palette.bg,
                      border: `1px solid ${palette.cardBorder}`,
                      color: palette.text,
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>ใช้รูปเริ่มต้น</span>
                  </button>
                </div>

                <p className="text-[11px]" style={{ color: palette.textMuted }}>
                  {isDataUri && profileImage !== DEFAULT_AVATAR_SVG
                    ? 'ใช้รูปที่อัปโหลดแล้ว (ย่อขนาด ≤160×160px JPEG 0.75 อัตโนมัติ)'
                    : 'ย่อขนาดอัปโหลดสูงสุด 160×160px (JPEG 0.75) เพื่อซิงก์ข้ามเครื่องไว'}
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="profile-logo-url-input"
                className="mb-1.5 block text-xs font-semibold"
                style={{ color: palette.text }}
              >
                วางลิงก์รูปภาพ (Image URL)
              </label>
              <input
                id="profile-logo-url-input"
                type="text"
                value={isDataUri ? '' : profileImage}
                onChange={(e) => updateProfileImage(e.target.value)}
                placeholder="https://example.com/logo.jpg (ใช้ลิงก์รูปตรงจากเว็บ)"
                className="w-full rounded-full px-4 py-2.5 text-xs outline-none focus:ring-2 sm:text-sm"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: `1px solid ${palette.cardBorder}`,
                  color: palette.text,
                }}
              />
            </div>
          </div>

          {/* Store / Website Name */}
          <div>
            <label
              htmlFor="profile-name-input"
              className="mb-1.5 block text-xs font-semibold"
              style={{ color: palette.text }}
            >
              ชื่อร้าน / หัวข้อหลักของเว็บ *
            </label>
            <input
              id="profile-name-input"
              type="text"
              value={coreName}
              onChange={(e) => setCoreName(e.target.value)}
              placeholder="เช่น moogrob"
              className="w-full rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2"
              style={{
                backgroundColor: '#FFFFFF',
                border: `1px solid ${palette.cardBorder}`,
                color: palette.text,
              }}
            />
          </div>

          {/* Store Name Frame Styles */}
          <div>
            <span
              className="mb-2 block text-xs font-semibold"
              style={{ color: palette.text }}
            >
              สไตล์กรอบตกแต่งชื่อร้าน
            </span>
            <div className="space-y-2" role="radiogroup" aria-label="สไตล์กรอบตกแต่งชื่อร้าน">
              {PROFILE_FRAME_STYLES.map((style) => {
                const selected = frameId === style.id;
                const previewText = formatProfileFrame(previewSample, style.id);
                return (
                  <button
                    key={style.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setFrameId(style.id)}
                    className="flex min-h-[42px] w-full items-center justify-between gap-3 rounded-full px-4 py-2 text-left text-xs transition-all hover:opacity-90 sm:text-sm"
                    style={{
                      backgroundColor: selected ? palette.accentSoft : '#FFFFFF',
                      border: selected
                        ? `1.5px solid ${palette.accent}`
                        : `1px solid ${palette.cardBorder}`,
                      color: palette.text,
                    }}
                  >
                    <span className={selected ? 'font-bold' : 'font-medium'}>
                      {style.label}
                    </span>
                    <span
                      className="truncate text-right text-xs"
                      style={{ color: selected ? palette.text : palette.textMuted }}
                    >
                      {previewText}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bio / Slogan */}
          <div>
            <label
              htmlFor="profile-bio-input"
              className="mb-1.5 block text-xs font-semibold"
              style={{ color: palette.text }}
            >
              คำโปรย / สโลแกนร้าน (Bio)
            </label>
            <textarea
              id="profile-bio-input"
              rows={3}
              value={profileBio}
              onChange={(e) => setProfileBio(e.target.value)}
              placeholder="คำอธิบายสั้นๆ เกี่ยวกับร้านหรือแบรนด์ของคุณ"
              className="w-full resize-none rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2"
              style={{
                backgroundColor: '#FFFFFF',
                border: `1px solid ${palette.cardBorder}`,
                color: palette.text,
              }}
            />
          </div>

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
              type="submit"
              disabled={uploading}
              className="min-h-[42px] whitespace-nowrap rounded-full px-6 py-2 text-xs font-semibold transition-transform active:scale-95 disabled:opacity-60 sm:text-sm"
              style={{ backgroundColor: palette.accent, color: palette.accentText }}
            >
              {uploading ? 'กำลังย่อรูป...' : 'บันทึกข้อมูลร้าน'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
