import type { CustomThemeColors, ThemeId, ThemePalette } from '../types/hub';

export const DEFAULT_CUSTOM_THEME: CustomThemeColors = {
  bg: '#FDF8E7',
  cardBg: '#FFFDF2',
  accent: '#6B4411',
};

export const PASTEL_THEMES: Record<Exclude<ThemeId, 'custom'>, ThemePalette> = {
  cream: {
    id: 'cream',
    label: 'ครีมคาราเมล',
    swatch: '#E7C27D',
    gradient: 'linear-gradient(135deg, #FFF7DC 0%, #DFB56C 100%)',
    bg: '#FDF8E7',
    bgSoft: '#F5EBD0',
    cardBg: '#FFFDF2',
    cardBorder: '#D8BE94',
    cardShadow: '0 6px 20px -6px rgba(107, 68, 17, 0.14)',
    text: '#6B4411',
    textMuted: '#8D6632',
    accent: '#6B4411',
    accentText: '#FFFDF2',
    accentSoft: '#F4E5C0',
    ring: '#6B4411',
  },
  pink: {
    id: 'pink',
    label: 'ชมพูพาสเทล',
    swatch: '#F3B0C9',
    gradient: 'linear-gradient(135deg, #FFEBF2 0%, #E594B3 100%)',
    bg: '#FDECF2',
    bgSoft: '#FADCE7',
    cardBg: '#FFFAFC',
    cardBorder: '#EFC2D3',
    cardShadow: '0 6px 20px -6px rgba(196, 86, 128, 0.12)',
    text: '#542B3B',
    textMuted: '#8B5C6F',
    accent: '#C45680',
    accentText: '#FFFFFF',
    accentSoft: '#FADCE7',
    ring: '#C45680',
  },
  peach: {
    id: 'peach',
    label: 'พีช',
    swatch: '#F5BD9C',
    gradient: 'linear-gradient(135deg, #FFF0E5 0%, #E79C74 100%)',
    bg: '#FEF2EA',
    bgSoft: '#FBE3D3',
    cardBg: '#FFFBF8',
    cardBorder: '#F0CBB4',
    cardShadow: '0 6px 20px -6px rgba(188, 102, 58, 0.12)',
    text: '#593320',
    textMuted: '#8F6049',
    accent: '#C2673C',
    accentText: '#FFFFFF',
    accentSoft: '#FBE3D3',
    ring: '#C2673C',
  },
  mint: {
    id: 'mint',
    label: 'มินต์',
    swatch: '#A7DFC9',
    gradient: 'linear-gradient(135deg, #E8FAF2 0%, #7AC4A7 100%)',
    bg: '#EAF8F2',
    bgSoft: '#D9F1E7',
    cardBg: '#FAFFFD',
    cardBorder: '#B9E2D1',
    cardShadow: '0 6px 20px -6px rgba(45, 128, 99, 0.12)',
    text: '#1D4235',
    textMuted: '#4A7566',
    accent: '#2D8063',
    accentText: '#FFFFFF',
    accentSoft: '#D9F1E7',
    ring: '#2D8063',
  },
  blue: {
    id: 'blue',
    label: 'ฟ้าใส',
    swatch: '#A9D3F5',
    gradient: 'linear-gradient(135deg, #EAF4FE 0%, #7BB4E6 100%)',
    bg: '#EAF4FC',
    bgSoft: '#DAEBF9',
    cardBg: '#FAFDFF',
    cardBorder: '#BFDAF0',
    cardShadow: '0 6px 20px -6px rgba(56, 118, 173, 0.12)',
    text: '#213D54',
    textMuted: '#53738D',
    accent: '#3876AD',
    accentText: '#FFFFFF',
    accentSoft: '#DCECF9',
    ring: '#3876AD',
  },
  purple: {
    id: 'purple',
    label: 'ลาเวนเดอร์',
    swatch: '#CAB4F2',
    gradient: 'linear-gradient(135deg, #F3EDFE 0%, #A98CE0 100%)',
    bg: '#F3EEFC',
    bgSoft: '#E8DFF9',
    cardBg: '#FCFAFF',
    cardBorder: '#D5C5F2',
    cardShadow: '0 6px 20px -6px rgba(114, 78, 178, 0.12)',
    text: '#392B54',
    textMuted: '#6A5B89',
    accent: '#724EB2',
    accentText: '#FFFFFF',
    accentSoft: '#E8DFF9',
    ring: '#724EB2',
  },
};

export const THEME_LIST: ThemePalette[] = [
  PASTEL_THEMES.cream,
  PASTEL_THEMES.pink,
  PASTEL_THEMES.peach,
  PASTEL_THEMES.mint,
  PASTEL_THEMES.blue,
  PASTEL_THEMES.purple,
];

export function isValidHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

export function normalizeHexColor(value: unknown, fallback: string): string {
  return isValidHexColor(value) ? value.trim().toUpperCase() : fallback;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

/** Blends `baseHex` toward `targetHex` by `ratio` (0 = baseHex, 1 = targetHex). */
export function blendHex(baseHex: string, targetHex: string, ratio: number): string {
  const [r1, g1, b1] = hexToRgb(normalizeHexColor(baseHex, '#FFFFFF'));
  const [r2, g2, b2] = hexToRgb(normalizeHexColor(targetHex, '#000000'));
  return rgbToHex(r1 + (r2 - r1) * ratio, g1 + (g2 - g1) * ratio, b1 + (b2 - b1) * ratio);
}

export function getContrastTextColor(bgHex: string): string {
  const [r, g, b] = hexToRgb(normalizeHexColor(bgHex, '#6B4411'));
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#2B2118' : '#FFFFFF';
}

export function buildCustomThemePalette(custom?: Partial<CustomThemeColors>): ThemePalette {
  const bg = normalizeHexColor(custom?.bg, DEFAULT_CUSTOM_THEME.bg);
  const cardBg = normalizeHexColor(custom?.cardBg, DEFAULT_CUSTOM_THEME.cardBg);
  const accent = normalizeHexColor(custom?.accent, DEFAULT_CUSTOM_THEME.accent);
  const [ar, ag, ab] = hexToRgb(accent);

  return {
    id: 'custom',
    label: 'กำหนดสีเอง',
    swatch: accent,
    gradient: `linear-gradient(135deg, ${bg} 0%, ${cardBg} 45%, ${accent} 100%)`,
    bg,
    bgSoft: blendHex(bg, accent, 0.09),
    cardBg,
    cardBorder: blendHex(cardBg, accent, 0.28),
    cardShadow: `0 6px 20px -6px rgba(${ar}, ${ag}, ${ab}, 0.15)`,
    text: accent,
    textMuted: blendHex(accent, cardBg, 0.28),
    accent,
    accentText: getContrastTextColor(accent),
    accentSoft: blendHex(cardBg, accent, 0.14),
    ring: accent,
  };
}

export function resolveActivePalette(
  themeId: ThemeId,
  customTheme?: Partial<CustomThemeColors>
): ThemePalette {
  if (themeId === 'custom') {
    return buildCustomThemePalette(customTheme);
  }
  return PASTEL_THEMES[themeId] || PASTEL_THEMES.cream;
}
