import type { HubData, ThemeId } from '../types/hub';
import {
  DEFAULT_SCRIPT_URL,
  STORAGE_DATA_KEY,
  STORAGE_SCRIPT_URL_KEY,
  buildCacheBustedScriptUrl,
  buildWebAppManifest,
  createDefaultHubData,
  isNonEmptyCloudPayload,
  resolveScriptUrl,
  sanitizeAndParseHubData,
} from './hubLogic';
import { resolveActivePalette } from './themes';

let activeManifestObjectUrl: string | null = null;

export function loadLocalHubData(): HubData {
  try {
    const raw = localStorage.getItem(STORAGE_DATA_KEY);
    if (raw) {
      const parsed = sanitizeAndParseHubData(JSON.parse(raw));
      if (parsed) return parsed;
    }
  } catch {
    // Ignore storage read errors and fall back to defaults
  }
  return createDefaultHubData();
}

export function saveLocalHubData(data: HubData): void {
  try {
    localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota errors
  }
}

export function loadScriptUrl(defaultUrl: string = DEFAULT_SCRIPT_URL): string {
  try {
    const stored = localStorage.getItem(STORAGE_SCRIPT_URL_KEY);
    return resolveScriptUrl(stored, defaultUrl);
  } catch {
    return resolveScriptUrl('', defaultUrl);
  }
}

export function saveScriptUrl(url: string): void {
  try {
    const trimmed = url.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_SCRIPT_URL_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_SCRIPT_URL_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function applyThemeAndIosMeta(data: HubData): void {
  const palette = resolveActivePalette(data.theme as ThemeId, data.customTheme);
  const root = document.documentElement;
  root.dataset.theme = palette.id;
  root.style.setProperty('--hub-bg', palette.bg);
  root.style.setProperty('--hub-text', palette.text);
  root.style.setProperty('--hub-accent', palette.accent);
  root.style.backgroundColor = palette.bg;

  const displayTitle = data.iosConfig.appName || data.profileName || 'Pastel Link Hub';
  document.title = displayTitle;

  const iosTitleMeta = document.getElementById('ios-app-title');
  if (iosTitleMeta) {
    iosTitleMeta.setAttribute('content', displayTitle);
  }

  const themeColorMeta = document.getElementById('app-theme-color');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', palette.bg);
  }

  const iconHref = data.iosConfig.appIcon || data.profileImage;
  if (iconHref) {
    const iosIcon = document.getElementById('ios-touch-icon');
    if (iosIcon) iosIcon.setAttribute('href', iconHref);
    const favicon = document.getElementById('app-favicon');
    if (favicon) favicon.setAttribute('href', iconHref);
  }

  // Update dynamic Web App Manifest so iOS/mobile Add to Home Screen uses latest logo & title
  try {
    const manifestEl = document.getElementById('app-manifest');
    if (manifestEl) {
      const manifestObj = buildWebAppManifest(data);
      const blob = new Blob([JSON.stringify(manifestObj)], { type: 'application/manifest+json' });
      const nextUrl = URL.createObjectURL(blob);
      if (activeManifestObjectUrl) {
        URL.revokeObjectURL(activeManifestObjectUrl);
      }
      activeManifestObjectUrl = nextUrl;
      manifestEl.setAttribute('href', nextUrl);
    }
  } catch {
    // Ignore manifest blob errors in constrained environments
  }
}

export async function fetchFromGoogleSheets(scriptUrl: string): Promise<HubData | null> {
  const url = scriptUrl.trim();
  if (!url) return null;

  const requestUrl = buildCacheBustedScriptUrl(url, Date.now());
  const response = await fetch(requestUrl, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const json = await response.json();
  const payload = json && typeof json === 'object' && 'data' in json ? json.data : json;
  if (!isNonEmptyCloudPayload(payload)) return null;

  return sanitizeAndParseHubData(payload);
}

export async function saveToGoogleSheets(scriptUrl: string, data: HubData): Promise<void> {
  const url = scriptUrl.trim();
  if (!url) return;

  // Use text/plain to avoid CORS preflight OPTIONS errors on Google Apps Script Web Apps
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({ data }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  try {
    const json = await response.json();
    if (json && json.ok === false) {
      throw new Error(json.error || 'Google Apps Script error');
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('Google Apps Script')) {
      throw err;
    }
    // Some GAS redirects return opaque or non-JSON text; if HTTP was 2xx, treat as saved.
  }
}
