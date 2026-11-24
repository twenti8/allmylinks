import type { HubData, LinkItem, ThemeId } from '../types/hub';
import {
  DEFAULT_CUSTOM_THEME,
  normalizeHexColor,
  resolveActivePalette,
} from './themes';

export const DEFAULT_PASSCODE = '1234';
export const GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzGGsKII9wIZExoBB038USbMOC2O3Im6FkgK6szNsFiO70gViDiNKnR-GS6gIk1akMq/exec';
export const STORAGE_DATA_KEY = 'pastel_link_hub_data_v1';
export const UPLOAD_IMAGE_MAX_PX = 160;
export const UPLOAD_IMAGE_QUALITY = 0.75;
export const PROFILE_LOGO_MAX_PX = UPLOAD_IMAGE_MAX_PX;
export const PROFILE_LOGO_QUALITY = UPLOAD_IMAGE_QUALITY;
export const PROFILE_LOGO_MAX_CHARS = 30000;

export function calculateContainedDimensions(
  srcWidth: number,
  srcHeight: number,
  maxDimension: number = PROFILE_LOGO_MAX_PX
): { width: number; height: number } {
  const w = Math.max(1, Math.round(srcWidth));
  const h = Math.max(1, Math.round(srcHeight));
  const cap = Math.max(1, Math.round(maxDimension));
  if (w <= cap && h <= cap) {
    return { width: w, height: h };
  }
  if (w >= h) {
    return { width: cap, height: Math.max(1, Math.round((h * cap) / w)) };
  }
  return { width: Math.max(1, Math.round((w * cap) / h)), height: cap };
}

export function buildCacheBustedScriptUrl(
  scriptUrl: string = GOOGLE_SCRIPT_URL,
  timestamp: number = Date.now()
): string {
  const trimmed = (scriptUrl || '').trim();
  if (!trimmed) return '';
  const separator = trimmed.includes('?') ? '&' : '?';
  return `${trimmed}${separator}t=${timestamp}`;
}

export function isNonEmptyCloudPayload(
  payload: unknown
): payload is Record<string, unknown> {
  return Boolean(
    payload &&
      typeof payload === 'object' &&
      !Array.isArray(payload) &&
      Object.keys(payload as Record<string, unknown>).length > 0
  );
}

// Cute inline SVG data URI for the default pastel profile avatar
export const DEFAULT_AVATAR_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
      <rect width="120" height="120" rx="60" fill="#FFFDF2"/>
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <rect x="34" y="34" width="52" height="48" rx="18" fill="#F6E3B8" stroke="#6B4411" stroke-width="4"/>
        <path d="M40 50 Q60 44 80 50" stroke="#C58F46" stroke-width="5"/>
        <circle cx="49" cy="60" r="3.5" fill="#6B4411"/>
        <circle cx="71" cy="60" r="3.5" fill="#6B4411"/>
        <path d="M55 67 Q60 72 65 67" stroke="#6B4411" stroke-width="3"/>
        <circle cx="43" cy="65" r="4" fill="#F4A3B7" opacity="0.75"/>
        <circle cx="77" cy="65" r="4" fill="#F4A3B7" opacity="0.75"/>
        <path d="M48 32 L54 24 L60 32 L66 24 L72 32" fill="#F7C2D6" stroke="#6B4411" stroke-width="3"/>
      </g>
    </svg>`
  );

export function createDefaultHubData(): HubData {
  return {
    profileName: '୨୧ ₊⁺₊⁺° moogrob °₊⁺₊ ୨୧',
    profileBio: 'พื้นที่รวมลิงก์เล็กๆ สไตล์มินิมอลพาสเทล ☁️✨',
    profileImage: DEFAULT_AVATAR_SVG,
    theme: 'cream',
    customTheme: { ...DEFAULT_CUSTOM_THEME },
    categories: ['finedae', 'work'],
    links: [
      {
        id: 'link-1',
        title: '♡･ﾟ finedaeivibe ﾟ･♡',
        subtitle: 'แวะเช็คคิวและดูรายละเอียดงานตรงนี้เลยฮับ',
        url: 'https://instagram.com',
        category: 'finedae',
        icon: '🥞',
      },
      {
        id: 'link-2',
        title: '♡･ﾟ finedaeivibe scan ﾟ･♡',
        subtitle: 'อัปเดตสถานะและสแกนคิวงานล่าสุด',
        url: 'https://line.me',
        category: 'finedae',
        icon: '🥪',
      },
      {
        id: 'link-3',
        title: '♡･ﾟ meta overwatch ﾟ･♡',
        subtitle: 'รวมโปรเจกต์และโน้ตส่วนตัว',
        url: 'https://github.com',
        category: 'work',
        icon: '🩵',
      },
      {
        id: 'link-4',
        title: '♡･ﾟ review finedaeivibe ﾟ･♡',
        subtitle: 'มีแต้มเท่าไหร่แล้วน้า? แวะรีวิวได้ฮับ',
        url: 'https://x.com',
        category: '',
        icon: '🍮',
      },
    ],
    music: {
      enabled: true,
      youtubeUrl: 'https://www.youtube.com/watch?v=lTRiuFIWV54',
      title: '1 A.M Study Session 📚',
      artist: 'Lofi Girl · Chill Beats',
      coverImage: '',
      volume: 45,
      autoplay: false,
      compactMode: true,
    },
    iosConfig: {
      appName: 'Pastel Link Hub',
      appIcon: DEFAULT_AVATAR_SVG,
    },
    passcode: DEFAULT_PASSCODE,
    updatedAt: new Date().toISOString(),
  };
}

export function extractYouTubeId(input: string): string | null {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;

  // Raw 11-character YouTube video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const normalized = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    const url = new URL(normalized);
    const host = url.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const vParam = url.searchParams.get('v');
      if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
        return vParam;
      }
      const segments = url.pathname.split('/').filter(Boolean);
      if (
        segments.length >= 2 &&
        (segments[0] === 'embed' || segments[0] === 'shorts' || segments[0] === 'live')
      ) {
        const id = segments[1];
        return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function formatPlaybackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const paddedSecs = String(secs).padStart(2, '0');
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${paddedSecs}`;
  }
  return `${mins}:${paddedSecs}`;
}

export function computeProgressPercent(currentTime: number, duration: number): number {
  if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) {
    return 0;
  }
  const ratio = (currentTime / duration) * 100;
  return Math.min(100, Math.max(0, ratio));
}

export function computeSeekTimeFromPercent(percent: number, duration: number): number {
  if (!Number.isFinite(percent) || !Number.isFinite(duration) || duration <= 0) {
    return 0;
  }
  const clampedPercent = Math.min(100, Math.max(0, percent));
  return (clampedPercent / 100) * duration;
}

export function extractUniqueCategories(links: LinkItem[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const link of links) {
    const trimmed = (link.category || '').trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }
  return result;
}

export function filterLinksByCategory(links: LinkItem[], activeCategory: string): LinkItem[] {
  const target = (activeCategory || '').trim();
  if (!target || target === 'all') {
    return links;
  }
  return links.filter((link) => (link.category || '').trim() === target);
}

export function reorderLinks(
  links: LinkItem[],
  index: number,
  direction: 'up' | 'down'
): LinkItem[] {
  if (index < 0 || index >= links.length) return links;
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= links.length) return links;

  const next = [...links];
  const [moved] = next.splice(index, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

export function normalizeUrl(url: string): string {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:')
  ) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function validatePasscode(input: string, expected: string): boolean {
  const cleanInput = (input || '').trim();
  const cleanExpected = (expected || DEFAULT_PASSCODE).trim();
  return cleanInput.length > 0 && cleanInput === cleanExpected;
}

export type ProfileFrameId = 'none' | 'heart' | 'sparkle' | 'bow' | 'minimal';

export const PROFILE_FRAME_STYLES: Array<{
  id: ProfileFrameId;
  label: string;
  prefix: string;
  suffix: string;
}> = [
  { id: 'none', label: 'เรียบง่าย (ไม่มีกรอบ)', prefix: '', suffix: '' },
  { id: 'heart', label: 'หัวใจละมุน', prefix: '♡ ₊⁺⋆ ', suffix: ' ⋆⁺₊ ♡' },
  { id: 'sparkle', label: 'วิบวับพาสเทล', prefix: '✧･ﾟ: *✧ ', suffix: ' ✧*:･ﾟ✧' },
  { id: 'bow', label: 'โบว์น่ารัก', prefix: '୨୧ ₊⁺₊⁺° ', suffix: ' °₊⁺₊ ୨୧' },
  { id: 'minimal', label: 'มินิมอลน่ารัก', prefix: '✿･ﾟ ', suffix: ' ﾟ･✿' },
];

export function parseProfileFrame(rawName: string): {
  coreName: string;
  frameId: ProfileFrameId;
} {
  const trimmed = (rawName || '').trim();
  for (const style of PROFILE_FRAME_STYLES) {
    if (style.id === 'none') continue;
    if (trimmed.startsWith(style.prefix) && trimmed.endsWith(style.suffix)) {
      const inner = trimmed
        .slice(style.prefix.length, trimmed.length - style.suffix.length)
        .trim();
      return { coreName: inner || trimmed, frameId: style.id };
    }
  }
  return { coreName: trimmed, frameId: 'none' };
}

export function formatProfileFrame(coreName: string, frameId: ProfileFrameId): string {
  const clean = (coreName || '').trim();
  if (!clean) return '';
  const style = PROFILE_FRAME_STYLES.find((s) => s.id === frameId);
  if (!style || style.id === 'none') return clean;
  return `${style.prefix}${clean}${style.suffix}`;
}

const LINK_TITLE_PREFIX = '♡･ﾟ ';
const LINK_TITLE_SUFFIX = ' ﾟ･♡';
const LINK_SUB_PREFIX = '~ ✿ ';
const LINK_SUB_SUFFIX = ' ✿ ~';

export function parseLinkDecoration(
  title: string,
  subtitle: string
): { coreTitle: string; coreSubtitle: string; decorated: boolean } {
  const t = (title || '').trim();
  const s = (subtitle || '').trim();
  const hasTitleDeco = t.startsWith(LINK_TITLE_PREFIX) && t.endsWith(LINK_TITLE_SUFFIX);
  const hasSubDeco = s.startsWith(LINK_SUB_PREFIX) && s.endsWith(LINK_SUB_SUFFIX);

  const coreTitle = hasTitleDeco
    ? t.slice(LINK_TITLE_PREFIX.length, t.length - LINK_TITLE_SUFFIX.length).trim()
    : t;
  const coreSubtitle = hasSubDeco
    ? s.slice(LINK_SUB_PREFIX.length, s.length - LINK_SUB_SUFFIX.length).trim()
    : s;

  return {
    coreTitle,
    coreSubtitle,
    decorated: hasTitleDeco || hasSubDeco,
  };
}

export function formatLinkDecoration(
  coreTitle: string,
  coreSubtitle: string,
  decorate: boolean
): { title: string; subtitle: string } {
  const cleanTitle = (coreTitle || '').trim();
  const cleanSub = (coreSubtitle || '').trim();
  if (!decorate) {
    return { title: cleanTitle, subtitle: cleanSub };
  }
  return {
    title: cleanTitle ? `${LINK_TITLE_PREFIX}${cleanTitle}${LINK_TITLE_SUFFIX}` : '',
    subtitle: cleanSub ? `${LINK_SUB_PREFIX}${cleanSub}${LINK_SUB_SUFFIX}` : '',
  };
}

export function extractHostname(rawUrl: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return '';
  try {
    const normalized = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    return new URL(normalized).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function getFaviconUrl(rawUrl: string): string {
  const host = extractHostname(rawUrl);
  if (!host) return '';
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
}

export function isValidThemeId(value: unknown): value is ThemeId {
  return (
    value === 'cream' ||
    value === 'pink' ||
    value === 'peach' ||
    value === 'mint' ||
    value === 'blue' ||
    value === 'purple' ||
    value === 'custom'
  );
}

export function buildWebAppManifest(data: HubData): Record<string, unknown> {
  const palette = resolveActivePalette(data.theme, data.customTheme);
  const appName = data.iosConfig.appName || data.profileName || 'Pastel Link Hub';
  const iconSrc = data.iosConfig.appIcon || data.profileImage || DEFAULT_AVATAR_SVG;
  const mimeType = iconSrc.startsWith('data:image/svg+xml')
    ? 'image/svg+xml'
    : iconSrc.startsWith('data:image/webp')
      ? 'image/webp'
      : 'image/png';

  return {
    name: appName,
    short_name: appName.slice(0, 24),
    start_url: '/',
    display: 'standalone',
    background_color: palette.bg,
    theme_color: palette.bg,
    icons: [
      {
        src: iconSrc,
        sizes: '400x400',
        type: mimeType,
        purpose: 'any maskable',
      },
    ],
  };
}

export function sanitizeAndParseHubData(raw: unknown): HubData | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const defaults = createDefaultHubData();

  const linksRaw = Array.isArray(obj.links) ? obj.links : defaults.links;
  const links: LinkItem[] = linksRaw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, idx) => ({
      id: typeof item.id === 'string' && item.id.trim() ? item.id : `link-${idx + 1}`,
      title: typeof item.title === 'string' && item.title.trim() ? item.title : 'Untitled Link',
      subtitle: typeof item.subtitle === 'string' ? item.subtitle : '',
      url: typeof item.url === 'string' ? item.url : 'https://example.com',
      category: typeof item.category === 'string' ? item.category.trim() : '',
      icon: typeof item.icon === 'string' && item.icon.trim() ? item.icon.trim() : '🔗',
    }));

  const categories = extractUniqueCategories(links);

  const musicRaw =
    obj.music && typeof obj.music === 'object' ? (obj.music as Record<string, unknown>) : {};
  const iosRaw =
    obj.iosConfig && typeof obj.iosConfig === 'object'
      ? (obj.iosConfig as Record<string, unknown>)
      : {};

  const parsedVolume =
    typeof musicRaw.volume === 'number' && Number.isFinite(musicRaw.volume)
      ? Math.min(100, Math.max(0, Math.round(musicRaw.volume)))
      : defaults.music.volume;

  const customRaw =
    obj.customTheme && typeof obj.customTheme === 'object'
      ? (obj.customTheme as Record<string, unknown>)
      : {};

  const resolvedProfileImage =
    typeof obj.profileImage === 'string' && obj.profileImage.trim()
      ? obj.profileImage.trim()
      : defaults.profileImage;

  return {
    profileName:
      typeof obj.profileName === 'string' && obj.profileName.trim()
        ? obj.profileName
        : defaults.profileName,
    profileBio: typeof obj.profileBio === 'string' ? obj.profileBio : defaults.profileBio,
    profileImage: resolvedProfileImage,
    theme: isValidThemeId(obj.theme) ? obj.theme : defaults.theme,
    customTheme: {
      bg: normalizeHexColor(customRaw.bg, DEFAULT_CUSTOM_THEME.bg),
      cardBg: normalizeHexColor(customRaw.cardBg, DEFAULT_CUSTOM_THEME.cardBg),
      accent: normalizeHexColor(customRaw.accent, DEFAULT_CUSTOM_THEME.accent),
    },
    categories,
    links,
    music: {
      enabled: typeof musicRaw.enabled === 'boolean' ? musicRaw.enabled : defaults.music.enabled,
      youtubeUrl:
        typeof musicRaw.youtubeUrl === 'string' ? musicRaw.youtubeUrl : defaults.music.youtubeUrl,
      title:
        typeof musicRaw.title === 'string' && musicRaw.title.trim()
          ? musicRaw.title
          : defaults.music.title,
      artist: typeof musicRaw.artist === 'string' ? musicRaw.artist : defaults.music.artist,
      coverImage:
        typeof musicRaw.coverImage === 'string'
          ? musicRaw.coverImage.trim()
          : defaults.music.coverImage,
      volume: parsedVolume,
      autoplay: typeof musicRaw.autoplay === 'boolean' ? musicRaw.autoplay : defaults.music.autoplay,
      compactMode:
        typeof musicRaw.compactMode === 'boolean'
          ? musicRaw.compactMode
          : defaults.music.compactMode,
    },
    iosConfig: {
      appName:
        typeof iosRaw.appName === 'string' && iosRaw.appName.trim()
          ? iosRaw.appName
          : defaults.iosConfig.appName,
      appIcon:
        typeof iosRaw.appIcon === 'string' && iosRaw.appIcon.trim()
          ? iosRaw.appIcon.trim()
          : resolvedProfileImage,
    },
    passcode:
      typeof obj.passcode === 'string' && obj.passcode.trim().length >= 4
        ? obj.passcode.trim()
        : defaults.passcode,
    updatedAt:
      typeof obj.updatedAt === 'string' && obj.updatedAt.trim()
        ? obj.updatedAt
        : new Date().toISOString(),
  };
}

export function extractUpdatedDataFromPostResponse(json: unknown): HubData | null {
  if (!json || typeof json !== 'object') return null;
  const record = json as Record<string, unknown>;
  if (!('updatedData' in record)) return null;
  if (!isNonEmptyCloudPayload(record.updatedData)) return null;
  return sanitizeAndParseHubData(record.updatedData);
}

export function buildGoogleAppsScriptCode(): string {
  return `// Pastel Link Hub — Google Apps Script Cloud Database
// รองรับการเก็บข้อมูลขนาดใหญ่โดยแบ่งเก็บเป็น Chunk ละ 40,000 ตัวอักษรในชีต "HubData"

var SHEET_NAME = 'HubData';
var CHUNK_SIZE = 40000;

function getOrCreateSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, 2).setValues([['chunk_index', 'payload']]);
  }
  return sheet;
}

function doGet(e) {
  try {
    var sheet = getOrCreateSheet_();
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return ContentService.createTextOutput(JSON.stringify({ ok: true, data: null }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var values = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
    var rawJson = values.map(function (row) { return row[0] || ''; }).join('');
    var parsed = rawJson ? JSON.parse(rawJson) : null;
    return ContentService.createTextOutput(JSON.stringify({ ok: true, data: parsed }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var body = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    var parsed = JSON.parse(body);
    var payloadObj = parsed && parsed.data ? parsed.data : parsed;
    var serialized = JSON.stringify(payloadObj);

    var sheet = getOrCreateSheet_();
    var lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      sheet.getRange(2, 1, lastRow - 1, 2).clearContent();
    }

    var rows = [];
    for (var i = 0; i < serialized.length; i += CHUNK_SIZE) {
      rows.push([rows.length, serialized.slice(i, i + CHUNK_SIZE)]);
    }
    if (rows.length === 0) {
      rows.push([0, '{}']);
    }
    sheet.getRange(2, 1, rows.length, 2).setValues(rows);

    return ContentService.createTextOutput(JSON.stringify({ ok: true, updatedAt: new Date().toISOString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildStandaloneHtml(data: HubData): string {
  const theme = resolveActivePalette(data.theme, data.customTheme);
  const serialized = JSON.stringify(data).replace(/</g, '\\u003c');
  const safeScriptUrl = JSON.stringify(GOOGLE_SCRIPT_URL).replace(/</g, '\\u003c');
  const title = escapeHtml(data.iosConfig.appName || data.profileName);
  const bio = escapeHtml(data.profileBio || '');
  const ytId = data.music.enabled ? extractYouTubeId(data.music.youtubeUrl) : null;

  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>${title}</title>
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-title" content="${title}" />
  <link rel="apple-touch-icon" href="${escapeHtml(data.iosConfig.appIcon || data.profileImage)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&family=Quicksand:wght@500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: ${theme.bg};
      --card: ${theme.cardBg};
      --border: ${theme.cardBorder};
      --text: ${theme.text};
      --muted: ${theme.textMuted};
      --accent: ${theme.accent};
      --accent-soft: ${theme.accentSoft};
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: var(--bg);
      color: var(--text);
      font-family: 'Quicksand', 'Noto Sans Thai', sans-serif;
      display: flex;
      justify-content: center;
      padding: 40px 16px 64px;
    }
    .container { width: 100%; max-width: 540px; text-align: center; }
    .avatar {
      width: 104px; height: 104px; border-radius: 50%; object-fit: cover;
      border: 3.5px solid var(--accent); background: #fff;
      box-shadow: 0 8px 24px -8px rgba(0,0,0,0.14);
    }
    h1 { font-size: 1.5rem; margin: 14px 0 6px; font-weight: 700; }
    .bio { font-size: 0.92rem; color: var(--muted); margin: 0 0 18px; }
    .tabs { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-bottom: 20px; }
    .tab {
      border: 1px solid var(--border); background: var(--card); color: var(--muted);
      border-radius: 999px; padding: 7px 16px; font-size: 0.85rem; font-weight: 600; cursor: pointer;
    }
    .tab.active { background: var(--accent); color: #fff; border-color: var(--accent); }
    .links { display: flex; flex-direction: column; gap: 12px; }
    .card {
      display: flex; align-items: center; gap: 14px; text-align: left;
      padding: 12px 18px; border-radius: 999px; background: var(--card);
      border: 1px solid var(--border); text-decoration: none; color: var(--text);
      box-shadow: 0 6px 20px -6px rgba(0,0,0,0.08); transition: transform 0.16s ease;
    }
    .card:hover { transform: translateY(-2px); }
    .thumb {
      width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: var(--accent-soft); font-size: 1.25rem; overflow: hidden;
    }
    .thumb img { width: 100%; height: 100%; object-fit: cover; }
    .meta { flex: 1; min-width: 0; }
    .title { font-weight: 600; font-size: 0.96rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sub { font-size: 0.78rem; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
    .cat { font-size: 0.72rem; padding: 3px 10px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); font-weight: 600; }
    .player { margin: 0 auto 20px; border-radius: 20px; overflow: hidden; border: 1px solid var(--border); background: var(--card); padding: 12px; }
  </style>
</head>
<body>
  <main class="container">
    <img class="avatar" id="avatar" src="${escapeHtml(data.profileImage)}" alt="${escapeHtml(data.profileName)}" />
    <h1 id="name">${escapeHtml(data.profileName)}</h1>
    ${bio ? `<p class="bio" id="bio">${bio}</p>` : ''}
    ${ytId ? `<div class="player"><iframe width="100%" height="150" src="https://www.youtube.com/embed/${escapeHtml(ytId)}?autoplay=${data.music.autoplay ? 1 : 0}" title="Music Player" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen style="border-radius:12px;"></iframe></div>` : ''}
    <div class="tabs" id="tabs"></div>
    <div class="links" id="links"></div>
  </main>
  <script>
    var HUB_DATA = ${serialized};
    var SCRIPT_URL = ${safeScriptUrl};
    var activeCat = 'all';
    function isImg(val) { return typeof val === 'string' && (val.startsWith('data:') || val.startsWith('http')); }
    function getAutoCategories(links) {
      var seen = {};
      var list = [];
      (links || []).forEach(function (l) {
        var c = typeof l.category === 'string' ? l.category.trim() : '';
        if (c && !seen[c]) {
          seen[c] = true;
          list.push(c);
        }
      });
      return list;
    }
    function render() {
      var tabsEl = document.getElementById('tabs');
      var linksEl = document.getElementById('links');
      var uniqueCats = getAutoCategories(HUB_DATA.links || []);
      tabsEl.innerHTML = '';
      if (uniqueCats.length === 0) {
        tabsEl.style.display = 'none';
        activeCat = 'all';
      } else {
        tabsEl.style.display = 'flex';
        if (activeCat !== 'all' && uniqueCats.indexOf(activeCat) === -1) {
          activeCat = 'all';
        }
        var cats = ['all'].concat(uniqueCats);
        cats.forEach(function (c) {
          var btn = document.createElement('button');
          btn.className = 'tab' + (activeCat === c ? ' active' : '');
          btn.textContent = c === 'all' ? 'ทั้งหมด' : c;
          btn.onclick = function () { activeCat = c; render(); };
          tabsEl.appendChild(btn);
        });
      }
      linksEl.innerHTML = '';
      (HUB_DATA.links || []).filter(function (l) {
        var c = typeof l.category === 'string' ? l.category.trim() : '';
        return activeCat === 'all' || c === activeCat;
      }).forEach(function (l) {
        var a = document.createElement('a');
        a.className = 'card';
        a.href = l.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        var thumb = document.createElement('div');
        thumb.className = 'thumb';
        if (isImg(l.icon)) {
          var img = document.createElement('img');
          img.src = l.icon;
          img.alt = l.title;
          thumb.appendChild(img);
        } else {
          thumb.textContent = l.icon || '🔗';
        }
        var meta = document.createElement('div');
        meta.className = 'meta';
        var t = document.createElement('div');
        t.className = 'title';
        t.textContent = l.title;
        meta.appendChild(t);
        if (l.subtitle) {
          var s = document.createElement('div');
          s.className = 'sub';
          s.textContent = l.subtitle;
          meta.appendChild(s);
        }
        a.appendChild(thumb);
        a.appendChild(meta);
        if (l.category) {
          var cat = document.createElement('span');
          cat.className = 'cat';
          cat.textContent = l.category;
          a.appendChild(cat);
        }
        linksEl.appendChild(a);
      });
      var avatarEl = document.getElementById('avatar');
      if (avatarEl && HUB_DATA.profileImage) {
        avatarEl.src = HUB_DATA.profileImage;
        avatarEl.alt = HUB_DATA.profileName || '';
      }
      var nameEl = document.getElementById('name');
      if (nameEl && HUB_DATA.profileName) {
        nameEl.textContent = HUB_DATA.profileName;
      }
      var bioEl = document.getElementById('bio');
      if (bioEl) {
        bioEl.textContent = HUB_DATA.profileBio || '';
      }
    }
    function pullCloud() {
      if (!SCRIPT_URL) return;
      var sep = SCRIPT_URL.indexOf('?') !== -1 ? '&' : '?';
      fetch(SCRIPT_URL + sep + 't=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          var next = res && typeof res === 'object' && 'data' in res ? res.data : res;
          if (next && typeof next === 'object' && !Array.isArray(next) && Object.keys(next).length > 0) {
            HUB_DATA = next;
            try { localStorage.setItem('pastel_link_hub_data_v1', JSON.stringify(next)); } catch (e) {}
            render();
          }
        })
        .catch(function () {});
    }
    render();
    pullCloud();
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState !== 'hidden') pullCloud();
    });
    window.addEventListener('focus', pullCloud);
  </script>
</body>
</html>`;
}
