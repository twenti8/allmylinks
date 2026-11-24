import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  ImagePlus,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { ConfirmModal } from './components/ConfirmModal';
import { LinkCard } from './components/LinkCard';
import { LinkModal } from './components/LinkModal';
import { MusicPlayer } from './components/MusicPlayer';
import { MusicSettingsBar } from './components/MusicSettingsBar';
import { PasscodeModal } from './components/PasscodeModal';
import { ProfileEditorModal } from './components/ProfileEditorModal';
import { SystemSettingsPanel, type PersistResult } from './components/SystemSettingsPanel';
import { ThemeSelector } from './components/ThemeSelector';
import type {
  CustomThemeColors,
  HubData,
  LinkItem,
  MusicConfig,
  SyncStatus,
  ThemeId,
} from './types/hub';
import {
  DEFAULT_AVATAR_SVG,
  PROFILE_LOGO_MAX_CHARS,
  PROFILE_LOGO_MAX_PX,
  PROFILE_LOGO_QUALITY,
  buildStandaloneHtml,
  createDefaultHubData,
  extractUniqueCategories,
  filterLinksByCategory,
  isImageSource,
  reorderLinks,
  sanitizeAndParseHubData,
  shouldSuppressCloudPull,
  syncMusicFields,
} from './utils/hubLogic';
import { resizeImageToDataUrl } from './utils/imageResize';
import {
  applyThemeAndIosMeta,
  fetchFromGoogleSheets,
  loadLocalHubData,
  saveLocalHubData,
  saveToGoogleSheets,
} from './utils/storage';
import { resolveActivePalette } from './utils/themes';

export default function App() {
  // Synchronous initial load from localStorage for Zero-Flash rendering
  const [data, setData] = useState<HubData>(() => loadLocalHubData());
  const latestDataRef = useRef<HubData>(data);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const commitLocalData = useCallback((nextData: HubData) => {
    const normalized = syncMusicFields(nextData);
    latestDataRef.current = normalized;
    saveLocalHubData(normalized);
    setData(normalized);
  }, []);

  // Modals
  const [passcodeModalOpen, setPasscodeModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LinkItem | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Sync & Toast Notification
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    state: 'idle',
    message: '',
  });
  const [notice, setNotice] = useState<string>('');

  const palette = resolveActivePalette(data.theme, data.customTheme);

  const showNotice = useCallback((msg: string) => {
    setNotice(msg);
    setTimeout(() => {
      setNotice((prev) => (prev === msg ? '' : prev));
    }, 3000);
  }, []);

  // Keep CSS theme variables & iOS meta tags synchronized
  useEffect(() => {
    applyThemeAndIosMeta(data);
  }, [data]);

  const isPullingRef = useRef(false);
  const isSavingRef = useRef(false);
  const saveSeqRef = useRef(0);
  const lastSaveAtRef = useRef(0);
  const lastPullAtRef = useRef(0);

  const hasOpenModalRef = useRef(false);
  hasOpenModalRef.current = Boolean(
    passcodeModalOpen ||
      profileModalOpen ||
      linkModalOpen ||
      deleteTarget ||
      resetConfirmOpen
  );

  // Hardcoded Cloud Sync on initial load & tab resume using GOOGLE_SCRIPT_URL directly
  // Suppressed while saving (isSyncing) and for 5 seconds after any save so old cloud data cannot overwrite fresh edits
  const pullCloudData = useCallback(
    async (silent = true) => {
      if (isPullingRef.current) return;
      if (
        shouldSuppressCloudPull({
          isSaving: isSavingRef.current,
          lastSaveAt: lastSaveAtRef.current,
          now: Date.now(),
        })
      ) {
        if (!silent) {
          showNotice('เพิ่งบันทึกข้อมูลล่าสุดแล้ว');
        }
        return;
      }

      isPullingRef.current = true;
      lastPullAtRef.current = Date.now();
      const pullStartSaveSeq = saveSeqRef.current;
      setSyncStatus({ state: 'syncing', message: 'กำลังซิงก์ข้อมูลจาก Google Sheets...' });

      try {
        const cloudData = await fetchFromGoogleSheets();
        // Discard stale GET response if a save started or finished while this GET was in-flight
        if (
          isSavingRef.current ||
          saveSeqRef.current !== pullStartSaveSeq ||
          shouldSuppressCloudPull({
            isSaving: false,
            lastSaveAt: lastSaveAtRef.current,
            now: Date.now(),
          })
        ) {
          return;
        }
        if (cloudData) {
          // Google Sheets is the source of truth: overwrite both React state and localStorage immediately
          commitLocalData(cloudData);
          setSyncStatus({
            state: 'synced',
            message: 'ซิงก์ข้อมูลล่าสุดแล้ว',
            lastSyncedAt: new Date().toISOString(),
          });
          if (!silent) showNotice('ดึงข้อมูลล่าสุดจาก Google Sheets เรียบร้อย');
        } else {
          setSyncStatus({ state: 'idle', message: 'ยังไม่มีข้อมูลใน Google Sheets' });
          if (!silent) showNotice('ยังไม่มีข้อมูลบน Cloud');
        }
      } catch {
        if (
          !isSavingRef.current &&
          saveSeqRef.current === pullStartSaveSeq
        ) {
          setSyncStatus({
            state: 'error',
            message: 'เชื่อมต่อ Google Sheets ไม่สำเร็จ (ใช้ข้อมูลในเครื่อง)',
          });
          if (!silent) showNotice('ดึงข้อมูลจาก Cloud ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        }
      } finally {
        isPullingRef.current = false;
      }
    },
    [commitLocalData, showNotice]
  );

  useEffect(() => {
    pullCloudData(true);

    const handleResumeSync = () => {
      if (document.visibilityState === 'hidden') return;
      if (hasOpenModalRef.current || isPullingRef.current) return;
      if (
        shouldSuppressCloudPull({
          isSaving: isSavingRef.current,
          lastSaveAt: lastSaveAtRef.current,
          now: Date.now(),
        })
      ) {
        return;
      }
      if (Date.now() - lastPullAtRef.current < 500) return;

      pullCloudData(true);
    };

    document.addEventListener('visibilitychange', handleResumeSync);
    window.addEventListener('focus', handleResumeSync);
    return () => {
      document.removeEventListener('visibilitychange', handleResumeSync);
      window.removeEventListener('focus', handleResumeSync);
    };
  }, [pullCloudData]);

  // Optimistic UI: synchronously commit to localStorage + state immediately (0ms),
  // suppress GET for 5 seconds, then POST complete latest JSON to Google Sheets
  const persistChanges = useCallback(
    async (nextData: HubData, pushCloud: boolean): Promise<PersistResult> => {
      const saveSeq = ++saveSeqRef.current;
      lastSaveAtRef.current = Date.now();
      const stamped: HubData = syncMusicFields({
        ...nextData,
        updatedAt: new Date().toISOString(),
      });
      commitLocalData(stamped);

      if (pushCloud) {
        isSavingRef.current = true;
        setSyncStatus({ state: 'syncing', message: 'กำลังซิงก์...' });
        try {
          const updatedFromCloud = await saveToGoogleSheets(stamped);
          lastSaveAtRef.current = Date.now();
          lastPullAtRef.current = Date.now();
          if (updatedFromCloud && saveSeq === saveSeqRef.current) {
            commitLocalData(updatedFromCloud);
          }
          setSyncStatus({
            state: 'synced',
            message: 'ซิงก์สำเร็จ',
            lastSyncedAt: new Date().toISOString(),
          });
          showNotice('บันทึกและซิงก์ข้อมูลขึ้น Google Sheets สำเร็จ');
          return { ok: true, cloudSynced: true };
        } catch {
          lastSaveAtRef.current = Date.now();
          setSyncStatus({
            state: 'error',
            message: 'ซิงก์ Cloud ไม่สำเร็จ',
          });
          showNotice('บันทึกในเครื่องแล้ว แต่ไม่สามารถส่งไป Google Sheets ได้');
          return { ok: false, cloudSynced: false };
        } finally {
          isSavingRef.current = false;
        }
      }

      return { ok: true, cloudSynced: false };
    },
    [commitLocalData, showNotice]
  );

  // Auto-grouped unique categories extracted from all links (trimmed & deduplicated)
  const autoCategories = useMemo(() => extractUniqueCategories(data.links), [data.links]);

  // Filtered links based on active category tab
  const visibleLinks = useMemo(
    () => filterLinksByCategory(data.links, activeCategory),
    [data.links, activeCategory]
  );

  // Ensure active category stays valid if links or their categories change
  useEffect(() => {
    if (activeCategory !== 'all' && !autoCategories.includes(activeCategory)) {
      setActiveCategory('all');
    }
  }, [autoCategories, activeCategory]);

  const handleSelectTheme = (themeId: ThemeId) => {
    saveSeqRef.current += 1;
    lastSaveAtRef.current = Date.now();
    commitLocalData({ ...latestDataRef.current, theme: themeId });
  };

  const handleUpdateCustomTheme = (nextCustom: CustomThemeColors) => {
    saveSeqRef.current += 1;
    lastSaveAtRef.current = Date.now();
    commitLocalData({
      ...latestDataRef.current,
      theme: 'custom',
      customTheme: nextCustom,
    });
  };

  const handleUpdateMusicConfig = (partial: Partial<MusicConfig>) => {
    saveSeqRef.current += 1;
    lastSaveAtRef.current = Date.now();
    const base = latestDataRef.current;
    commitLocalData({
      ...base,
      music: { ...base.music, ...partial },
    });
  };

  const handleChangePasscode = async (newPasscode: string): Promise<PersistResult> => {
    const cleanPasscode = newPasscode.trim();

    // Build payload directly with `passcode: cleanPasscode` without reading stale React state
    const payloadWithNewPasscode: HubData = {
      ...latestDataRef.current,
      passcode: cleanPasscode,
    };

    return persistChanges(payloadWithNewPasscode, true);
  };

  const handleSaveLink = (payload: Omit<LinkItem, 'id'> & { id?: string }) => {
    const current = latestDataRef.current;
    let nextLinks: LinkItem[];
    if (payload.id) {
      nextLinks = current.links.map((item) =>
        item.id === payload.id
          ? {
              ...item,
              title: payload.title,
              subtitle: payload.subtitle,
              url: payload.url,
              category: payload.category,
              icon: payload.icon,
            }
          : item
      );
    } else {
      const newItem: LinkItem = {
        id: `link-${Date.now()}`,
        title: payload.title,
        subtitle: payload.subtitle,
        url: payload.url,
        category: payload.category,
        icon: payload.icon,
      };
      nextLinks = [...current.links, newItem];
    }

    setLinkModalOpen(false);
    setEditingLink(null);
    persistChanges(
      { ...current, links: nextLinks, categories: extractUniqueCategories(nextLinks) },
      true
    );
  };

  const handleMoveLink = (visibleIndex: number, direction: 'up' | 'down') => {
    const current = latestDataRef.current;
    const targetLink = visibleLinks[visibleIndex];
    if (!targetLink) return;
    const realIndex = current.links.findIndex((l) => l.id === targetLink.id);
    if (realIndex === -1) return;

    // If filtered, swap within the full list relative to adjacent visible item
    if (activeCategory !== 'all') {
      const swapVisibleIdx = direction === 'up' ? visibleIndex - 1 : visibleIndex + 1;
      const swapLink = visibleLinks[swapVisibleIdx];
      if (!swapLink) return;
      const swapRealIndex = current.links.findIndex((l) => l.id === swapLink.id);
      if (swapRealIndex === -1) return;
      const nextLinks = [...current.links];
      const temp = nextLinks[realIndex];
      nextLinks[realIndex] = nextLinks[swapRealIndex];
      nextLinks[swapRealIndex] = temp;
      persistChanges({ ...current, links: nextLinks }, false);
      return;
    }

    const nextLinks = reorderLinks(current.links, realIndex, direction);
    persistChanges({ ...current, links: nextLinks }, false);
  };

  const handleConfirmDeleteLink = () => {
    if (!deleteTarget) return;
    const current = latestDataRef.current;
    const nextLinks = current.links.filter((l) => l.id !== deleteTarget.id);
    setDeleteTarget(null);
    persistChanges(
      { ...current, links: nextLinks, categories: extractUniqueCategories(nextLinks) },
      true
    );
  };

  const handleSaveProfile = (partial: Partial<HubData>) => {
    const current = latestDataRef.current;
    const updated: HubData = {
      ...current,
      ...partial,
    };
    setProfileModalOpen(false);
    persistChanges(updated, true);
  };


  const handleExportJson = () => {
    const current = latestDataRef.current;
    const blob = new Blob([JSON.stringify(current, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pastel-link-hub-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotice('ส่งออกไฟล์ JSON เรียบร้อย');
  };

  const handleImportJson = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = sanitizeAndParseHubData(JSON.parse(text));
      if (!parsed) {
        showNotice('ไฟล์ JSON ไม่ถูกต้อง');
        return;
      }
      await persistChanges(parsed, true);
      showNotice('นำเข้าข้อมูล JSON สำเร็จ');
    } catch {
      showNotice('ไม่สามารถอ่านไฟล์ JSON ได้');
    }
  };

  const handleDownloadHtml = () => {
    const html = buildStandaloneHtml(latestDataRef.current);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pastel-link-hub.html';
    a.click();
    URL.revokeObjectURL(url);
    showNotice('ดาวน์โหลด Single-file HTML เรียบร้อย');
  };

  const handleConfirmReset = () => {
    const fresh = createDefaultHubData();
    setResetConfirmOpen(false);
    setActiveCategory('all');
    persistChanges(fresh, true);
    showNotice('รีเซ็ตข้อมูลเป็นค่าเริ่มต้นแล้ว');
  };

  const handleQuickLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const resized = await resizeImageToDataUrl(
        file,
        PROFILE_LOGO_MAX_PX,
        'jpeg',
        PROFILE_LOGO_QUALITY,
        PROFILE_LOGO_MAX_CHARS
      );
      const current = latestDataRef.current;
      const updated: HubData = {
        ...current,
        profileImage: resized,
        iosConfig: {
          ...current.iosConfig,
          appIcon: resized,
        },
      };
      void persistChanges(updated, true);
      showNotice('อัปเดตรูปโลโก้แล้ว');
    } catch {
      showNotice('ไม่สามารถอัปโหลดรูปโลโก้ได้');
    }
  };

  const handleSyncNow = () => {
    pullCloudData(false);
  };

  return (
    <div
      className="min-h-screen w-full transition-colors duration-200"
      style={{ backgroundColor: palette.bg, color: palette.text }}
    >
      {/* Top-Right Unlock / Admin Controls + Subtle Sync Status Indicator */}
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between gap-2 px-4 pt-4 sm:px-6 sm:pt-5">
        <div className="min-w-0">
          {isAdmin && syncStatus.message && (
            <div
              role="status"
              aria-live="polite"
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-sm"
              style={{
                backgroundColor: palette.cardBg,
                border: `1px solid ${palette.cardBorder}`,
                color:
                  syncStatus.state === 'error'
                    ? '#DC2626'
                    : syncStatus.state === 'synced'
                      ? palette.accent
                      : palette.textMuted,
              }}
            >
              {syncStatus.state === 'syncing' ? (
                <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
              ) : syncStatus.state === 'error' ? (
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              )}
              <span className="truncate">{syncStatus.message}</span>
            </div>
          )}
        </div>

        {!isAdmin ? (
          <button
            type="button"
            onClick={() => setPasscodeModalOpen(true)}
            className="flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-full px-5 py-2 text-xs font-semibold transition-transform hover:scale-[1.02] active:scale-95 sm:text-sm"
            style={{
              backgroundColor: palette.cardBg,
              border: `1px solid ${palette.cardBorder}`,
              color: palette.text,
              boxShadow: palette.cardShadow,
            }}
          >
            <KeyRound className="h-4 w-4 shrink-0" style={{ color: palette.accent }} aria-hidden="true" />
            <span>ปลดล็อกโหมดแก้ไข</span>
          </button>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => persistChanges(latestDataRef.current, true)}
              className="flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-85 sm:text-sm"
              style={{
                backgroundColor: palette.cardBg,
                border: `1px solid ${palette.cardBorder}`,
                color: palette.text,
              }}
            >
              {syncStatus.state === 'syncing' ? (
                <RefreshCw className="h-4 w-4 animate-spin" style={{ color: palette.accent }} aria-hidden="true" />
              ) : (
                <CloudUpload className="h-4 w-4" style={{ color: palette.accent }} aria-hidden="true" />
              )}
              <span>บันทึก & ซิงก์ Cloud</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAdmin(false)}
              className="flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-full px-5 py-2 text-xs font-bold shadow-sm transition-transform active:scale-95 sm:text-sm"
              style={{ backgroundColor: palette.accent, color: palette.accentText }}
            >
              <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>ล็อกหน้าเว็บ</span>
            </button>
          </div>
        )}
      </header>

      {/* Subtle Toast Banner when saving/syncing */}
      {notice && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-40 -translate-x-1/2 px-4">
          <div
            role="status"
            className="flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold shadow-lg"
            style={{ backgroundColor: palette.accent, color: palette.accentText }}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{notice}</span>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main
        className={`mx-auto w-full px-4 pb-16 pt-2 sm:px-6 sm:pt-4 ${
          isAdmin ? 'max-w-2xl' : 'max-w-[560px]'
        }`}
      >
        {/* Profile Header */}
        <section className="flex flex-col items-center text-center" aria-label="ข้อมูลโปรไฟล์">
          <div
            className="h-24 w-24 overflow-hidden rounded-full bg-white p-1 shadow-md sm:h-28 sm:w-28"
            style={{
              border: `3.5px solid ${palette.accent}`,
            }}
          >
            <img
              src={isImageSource(data.profileImage) ? data.profileImage.trim() : DEFAULT_AVATAR_SVG}
              alt={data.profileName}
              referrerPolicy="no-referrer"
              className="h-full w-full rounded-full object-cover"
            />
          </div>

          <h1
            className="mt-4 text-balance text-xl font-bold tracking-tight sm:text-2xl"
            style={{ color: palette.text }}
          >
            {data.profileName}
          </h1>

          {data.profileBio && (
            <p
              className="mt-1.5 max-w-md text-sm leading-relaxed"
              style={{ color: palette.textMuted }}
            >
              {data.profileBio}
            </p>
          )}

          {/* Admin Profile & Logo Edit Controls (Hidden completely in Public View) */}
          {isAdmin && (
            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
              <label
                className="flex min-h-[40px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition-opacity hover:opacity-85"
                style={{
                  backgroundColor: palette.cardBg,
                  border: `1px solid ${palette.cardBorder}`,
                  color: palette.text,
                }}
              >
                <ImagePlus className="h-3.5 w-3.5" style={{ color: palette.accent }} aria-hidden="true" />
                <span>เปลี่ยนรูปโลโก้ (140px)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQuickLogoUpload}
                  className="sr-only"
                />
              </label>

              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                className="flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition-opacity hover:opacity-85"
                style={{
                  backgroundColor: palette.accentSoft,
                  color: palette.accent,
                }}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                <span>แก้ไขข้อมูลร้าน / หัวข้อเว็บ</span>
              </button>
            </div>
          )}
        </section>

        {/* Admin-Only Theme Selector */}
        {isAdmin && (
          <ThemeSelector
            currentTheme={data.theme}
            customTheme={data.customTheme}
            palette={palette}
            onSelectTheme={handleSelectTheme}
            onUpdateCustomTheme={handleUpdateCustomTheme}
            onSaveTheme={() => persistChanges(latestDataRef.current, true)}
          />
        )}

        {/* Auto-Grouped Category Filter Tabs — hidden when no links have a category */}
        {autoCategories.length > 0 && (
          <nav
            aria-label="ตัวกรองหมวดหมู่ลิงก์"
            className="mt-6 flex flex-wrap items-center justify-center gap-2"
          >
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              aria-pressed={activeCategory === 'all'}
              className="min-h-[40px] whitespace-nowrap rounded-full px-5 py-1.5 text-xs font-semibold transition-all sm:text-sm"
              style={{
                backgroundColor: activeCategory === 'all' ? palette.accent : palette.cardBg,
                color: activeCategory === 'all' ? palette.accentText : palette.text,
                border: `1px solid ${
                  activeCategory === 'all' ? palette.accent : palette.cardBorder
                }`,
              }}
            >
              ทั้งหมด
            </button>
            {autoCategories.map((cat) => {
              const isSelected = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  aria-pressed={isSelected}
                  className="min-h-[40px] whitespace-nowrap rounded-full px-5 py-1.5 text-xs font-semibold transition-all sm:text-sm"
                  style={{
                    backgroundColor: isSelected ? palette.accent : palette.cardBg,
                    color: isSelected ? palette.accentText : palette.text,
                    border: `1px solid ${isSelected ? palette.accent : palette.cardBorder}`,
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </nav>
        )}

        {/* Admin Add Link Button */}
        {isAdmin && (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setEditingLink(null);
                setLinkModalOpen(true);
              }}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border-2 border-dashed px-5 py-2.5 text-sm font-bold transition-opacity hover:opacity-80"
              style={{
                borderColor: palette.accent,
                color: palette.accent,
                backgroundColor: palette.cardBg,
              }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              เพิ่มลิงก์ใหม่
            </button>
          </div>
        )}

        {/* Link Cards List */}
        <section aria-label="รายการลิงก์" className="mt-5 flex flex-col gap-3">
          {visibleLinks.length === 0 ? (
            <div
              className="rounded-3xl p-8 text-center text-sm"
              style={{
                backgroundColor: palette.cardBg,
                border: `1px solid ${palette.cardBorder}`,
                color: palette.textMuted,
              }}
            >
              ยังไม่มีลิงก์ในหมวดหมู่นี้
            </div>
          ) : (
            visibleLinks.map((link, idx) => (
              <LinkCard
                key={link.id}
                link={link}
                index={idx}
                total={visibleLinks.length}
                isAdmin={isAdmin}
                palette={palette}
                onEdit={(item) => {
                  setEditingLink(item);
                  setLinkModalOpen(true);
                }}
                onDelete={(item) => setDeleteTarget(item)}
                onMove={handleMoveLink}
              />
            ))
          )}
        </section>

        {/* Minimal YouTube Music Player — Placed at the bottom below all link cards */}
        <div className="mt-6">
          <MusicPlayer
            config={data.music}
            palette={palette}
            onUpdateConfig={handleUpdateMusicConfig}
          />
        </div>

        {/* Bottom Subtle Sync Now Bar */}
        <footer className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={syncStatus.state === 'syncing'}
            className="inline-flex min-h-[34px] items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1 text-[11px] font-medium transition-opacity hover:opacity-100 disabled:opacity-60"
            style={{
              backgroundColor: palette.cardBg,
              border: `1px solid ${palette.cardBorder}`,
              color: palette.textMuted,
              opacity: 0.85,
            }}
          >
            <RefreshCw
              className={`h-3 w-3 shrink-0 ${syncStatus.state === 'syncing' ? 'animate-spin' : ''}`}
              style={{ color: palette.accent }}
              aria-hidden="true"
            />
            <span>
              {syncStatus.state === 'syncing'
                ? 'กำลังซิงก์ข้อมูล...'
                : 'ซิงก์ข้อมูลล่าสุด (Sync Now)'}
            </span>
          </button>
        </footer>

        {/* Admin-Only Music Settings Bar */}
        {isAdmin && (
          <MusicSettingsBar
            config={data.music}
            palette={palette}
            onPreviewCover={(nextCover) => handleUpdateMusicConfig({ coverImage: nextCover })}
            onSaveMusic={(updatedMusic) => {
              const current = latestDataRef.current;
              persistChanges({ ...current, music: updatedMusic }, true);
            }}
          />
        )}

        {/* System Settings & Backup Panel — STRICTLY Admin Mode Only */}
        {isAdmin && (
          <SystemSettingsPanel
            data={data}
            syncStatus={syncStatus}
            palette={palette}
            onChangePasscode={handleChangePasscode}
            onExportJson={handleExportJson}
            onImportJson={handleImportJson}
            onDownloadHtml={handleDownloadHtml}
            onRequestReset={() => setResetConfirmOpen(true)}
          />
        )}
      </main>

      {/* Modals */}
      <PasscodeModal
        open={passcodeModalOpen}
        expectedPasscode={data.passcode}
        palette={palette}
        onUnlock={() => {
          setPasscodeModalOpen(false);
          setIsAdmin(true);
          showNotice('เข้าสู่โหมดแก้ไขแล้ว');
        }}
        onClose={() => setPasscodeModalOpen(false)}
      />

      {profileModalOpen && (
        <ProfileEditorModal
          open={profileModalOpen}
          data={data}
          palette={palette}
          onSave={handleSaveProfile}
          onClose={() => setProfileModalOpen(false)}
        />
      )}

      {linkModalOpen && (
        <LinkModal
          open={linkModalOpen}
          editingLink={editingLink}
          categories={autoCategories}
          palette={palette}
          onSave={handleSaveLink}
          onClose={() => {
            setLinkModalOpen(false);
            setEditingLink(null);
          }}
        />
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="ยืนยันการลบลิงก์"
        message={`ต้องการลบลิงก์ "${deleteTarget?.title || ''}" ออกจากหน้าเว็บใช่หรือไม่?`}
        confirmLabel="ลบลิงก์"
        destructive
        palette={palette}
        onConfirm={handleConfirmDeleteLink}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmModal
        open={resetConfirmOpen}
        title="รีเซ็ตค่าเริ่มต้นทั้งหมด"
        message="ข้อมูลโปรไฟล์ ลิงก์ทั้งหมด และการตั้งค่าธีมจะถูกคืนค่าเป็นค่าเริ่มต้น คุณต้องการดำเนินการต่อหรือไม่?"
        confirmLabel="ยืนยันรีเซ็ต"
        destructive
        palette={palette}
        onConfirm={handleConfirmReset}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </div>
  );
}
