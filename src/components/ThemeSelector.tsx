import React from 'react';
import { Palette, Save } from 'lucide-react';
import type { CustomThemeColors, ThemeId, ThemePalette } from '../types/hub';
import { THEME_LIST, buildCustomThemePalette } from '../utils/themes';

interface ThemeSelectorProps {
  currentTheme: ThemeId;
  customTheme: CustomThemeColors;
  palette: ThemePalette;
  onSelectTheme: (themeId: ThemeId) => void;
  onUpdateCustomTheme: (next: CustomThemeColors) => void;
  onSaveTheme: () => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentTheme,
  customTheme,
  palette,
  onSelectTheme,
  onUpdateCustomTheme,
  onSaveTheme,
}) => {
  const customPreview = buildCustomThemePalette(customTheme);
  const isCustomActive = currentTheme === 'custom';

  const handleColorChange = (key: keyof CustomThemeColors, value: string) => {
    onUpdateCustomTheme({
      ...customTheme,
      [key]: value.toUpperCase(),
    });
  };

  return (
    <section
      aria-label="ธีมสีของหน้าเว็บ"
      className="mt-5 w-full rounded-3xl p-5"
      style={{
        backgroundColor: palette.cardBg,
        border: `1px solid ${palette.cardBorder}`,
        boxShadow: palette.cardShadow,
        color: palette.text,
      }}
    >
      <div className="mb-3.5 text-left">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Palette className="h-4 w-4 shrink-0" style={{ color: palette.accent }} aria-hidden="true" />
          <h2>ธีมสีของหน้าเว็บ</h2>
        </div>
        <p className="mt-1 text-xs" style={{ color: palette.textMuted }}>
          สีพื้นหลัง ปุ่ม การ์ด ตัวหนังสือ และขอบวงกลมโปรไฟล์เปลี่ยนตามกัน
        </p>
      </div>

      <div
        role="group"
        aria-label="เปลี่ยนธีมสีพาสเทล"
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"
      >
        {THEME_LIST.map((t) => {
          const active = currentTheme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTheme(t.id)}
              aria-label={`ธีมสี${t.label}`}
              aria-pressed={active}
              className="flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-2xl p-2.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: palette.bg,
                border: active ? `2px solid ${palette.accent}` : `1px solid ${palette.cardBorder}`,
                boxShadow: active ? `0 0 0 2px ${palette.accentSoft}` : undefined,
              }}
            >
              <span
                className="block h-7 w-full rounded-lg"
                style={{
                  background: t.gradient,
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                }}
              />
              <span
                className="whitespace-nowrap text-xs font-semibold"
                style={{ color: palette.text }}
              >
                {t.label}
              </span>
            </button>
          );
        })}

        {/* Custom Color Option */}
        <button
          type="button"
          onClick={() => onSelectTheme('custom')}
          aria-label="กำหนดสีเอง (Custom Color)"
          aria-pressed={isCustomActive}
          className="flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-2xl p-2.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            backgroundColor: palette.bg,
            border: isCustomActive
              ? `2px solid ${palette.accent}`
              : `1px solid ${palette.cardBorder}`,
            boxShadow: isCustomActive ? `0 0 0 2px ${palette.accentSoft}` : undefined,
          }}
        >
          <span
            className="flex h-7 w-full items-center justify-center gap-1.5 rounded-lg px-2"
            style={{
              background: customPreview.gradient,
              border: '1px solid rgba(0, 0, 0, 0.08)',
            }}
          >
            <span
              className="h-3.5 w-3.5 rounded-full border border-black/15 shadow-xs"
              style={{ backgroundColor: customTheme.bg }}
            />
            <span
              className="h-3.5 w-3.5 rounded-full border border-black/15 shadow-xs"
              style={{ backgroundColor: customTheme.cardBg }}
            />
            <span
              className="h-3.5 w-3.5 rounded-full border border-white/60 shadow-xs"
              style={{ backgroundColor: customTheme.accent }}
            />
          </span>
          <span
            className="whitespace-nowrap text-xs font-semibold"
            style={{ color: palette.text }}
          >
            กำหนดสีเอง
          </span>
        </button>
      </div>

      {/* Custom 3-Point Color Picker Panel */}
      {isCustomActive && (
        <div
          aria-label="ตัวเลือกสีที่กำหนดเอง"
          className="mt-4 rounded-2xl p-4"
          style={{
            backgroundColor: palette.bg,
            border: `1px solid ${palette.cardBorder}`,
          }}
        >
          <p className="mb-3 text-xs font-bold" style={{ color: palette.text }}>
            ปรับแต่งสีทั้ง 3 จุดของหน้าเว็บได้อิสระ
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* 1. Background Color */}
            <label
              htmlFor="custom-color-bg"
              className="flex min-h-[56px] cursor-pointer items-center justify-between gap-2.5 rounded-xl px-3 py-2 transition-opacity hover:opacity-90"
              style={{
                backgroundColor: palette.cardBg,
                border: `1px solid ${palette.cardBorder}`,
              }}
            >
              <div className="min-w-0">
                <div className="text-xs font-semibold" style={{ color: palette.text }}>
                  สีพื้นหลังหลัก
                </div>
                <div
                  className="font-mono text-[11px] uppercase tabular-nums"
                  style={{ color: palette.textMuted }}
                >
                  {customTheme.bg}
                </div>
              </div>
              <input
                id="custom-color-bg"
                type="color"
                aria-label="สีพื้นหลังหลัก (Background Color)"
                value={customTheme.bg}
                onChange={(e) => handleColorChange('bg', e.target.value)}
                className="h-9 w-11 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0"
              />
            </label>

            {/* 2. Card / Button Color */}
            <label
              htmlFor="custom-color-card"
              className="flex min-h-[56px] cursor-pointer items-center justify-between gap-2.5 rounded-xl px-3 py-2 transition-opacity hover:opacity-90"
              style={{
                backgroundColor: palette.cardBg,
                border: `1px solid ${palette.cardBorder}`,
              }}
            >
              <div className="min-w-0">
                <div className="text-xs font-semibold" style={{ color: palette.text }}>
                  สีพื้นหลังการ์ด/ปุ่ม
                </div>
                <div
                  className="font-mono text-[11px] uppercase tabular-nums"
                  style={{ color: palette.textMuted }}
                >
                  {customTheme.cardBg}
                </div>
              </div>
              <input
                id="custom-color-card"
                type="color"
                aria-label="สีพื้นหลังการ์ดและปุ่มลิงก์ (Card / Button Color)"
                value={customTheme.cardBg}
                onChange={(e) => handleColorChange('cardBg', e.target.value)}
                className="h-9 w-11 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0"
              />
            </label>

            {/* 3. Text & Accent Color */}
            <label
              htmlFor="custom-color-accent"
              className="flex min-h-[56px] cursor-pointer items-center justify-between gap-2.5 rounded-xl px-3 py-2 transition-opacity hover:opacity-90"
              style={{
                backgroundColor: palette.cardBg,
                border: `1px solid ${palette.cardBorder}`,
              }}
            >
              <div className="min-w-0">
                <div className="whitespace-nowrap text-xs font-semibold" style={{ color: palette.text }}>
                  สีตัวอักษร/ขอบ
                </div>
                <div
                  className="font-mono text-[11px] uppercase tabular-nums"
                  style={{ color: palette.textMuted }}
                >
                  {customTheme.accent}
                </div>
              </div>
              <input
                id="custom-color-accent"
                type="color"
                aria-label="สีตัวอักษรและเส้นขอบหลัก (Text & Accent Color)"
                value={customTheme.accent}
                onChange={(e) => handleColorChange('accent', e.target.value)}
                className="h-9 w-11 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0"
              />
            </label>
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-start">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onSaveTheme();
          }}
          className="flex min-h-[42px] items-center gap-1.5 whitespace-nowrap rounded-full px-5 text-xs font-semibold transition-transform active:scale-95"
          style={{ backgroundColor: palette.accent, color: palette.accentText }}
        >
          <Save className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>บันทึกธีมสี</span>
        </button>
      </div>
    </section>
  );
};
