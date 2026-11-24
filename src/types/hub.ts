export type ThemeId = 'cream' | 'pink' | 'peach' | 'mint' | 'blue' | 'purple' | 'custom';

export interface CustomThemeColors {
  bg: string;
  cardBg: string;
  accent: string;
}

export interface LinkItem {
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  category: string;
  icon: string; // Either a data URL, external URL, or emoji/preset key
}

export interface MusicConfig {
  enabled: boolean;
  showPlayer?: boolean;
  youtubeUrl: string;
  title: string;
  songTitle?: string;
  artist: string;
  coverImage: string;
  musicCover?: string;
  volume: number; // 0 - 100
  autoplay: boolean;
  autoPlay?: boolean;
  compactMode: boolean;
}

export interface IosConfig {
  appName: string;
  appIcon: string;
}

export interface HubData {
  profileName: string;
  profileBio: string;
  profileImage: string;
  theme: ThemeId;
  customTheme: CustomThemeColors;
  categories: string[];
  links: LinkItem[];
  music: MusicConfig;
  youtubeUrl?: string;
  songTitle?: string;
  musicCover?: string;
  showPlayer?: boolean;
  autoPlay?: boolean;
  iosConfig: IosConfig;
  passcode: string;
  updatedAt: string;
}

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error';

export interface SyncStatus {
  state: SyncState;
  message: string;
  lastSyncedAt?: string;
}

export interface ThemePalette {
  id: ThemeId;
  label: string;
  swatch: string;
  gradient: string;
  bg: string;
  bgSoft: string;
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  text: string;
  textMuted: string;
  accent: string;
  accentText: string;
  accentSoft: string;
  ring: string;
}
