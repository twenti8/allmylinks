import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  CloudUpload,
  ImagePlus,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { AppsScriptModal } from './components/AppsScriptModal';
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
  buildStandaloneHtml,
  createDefaultHubData,
  extractUniqueCategories,
  filterLinksByCategory,
  reorderLinks,
  sanitizeAndParseHubData,
} from './utils/hubLogic';
import { resizeImageToDataUrl } from './utils/imageResize';
import {
  applyThemeAndIosMeta,
  fetchFromGoogleSheets,
  loadLocalHubData,
  loadScriptUrl,
  saveLocalHubData,
  saveScriptUrl,
  saveToGoogleSheets,
} from './utils/storage';
import { resolveActivePalette } from './utils/themes';

export default function App() {
  // Synchronous initial load from localStorage for Zero-Flash rendering
  const [data, setData] = useState<HubData>(() => loadLocalHubData());
  const latestDataRef = useRef<HubData>(data);
  const [scriptUrl, setScriptUrl] = useState<string>(() => loadScriptUrl());
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const commitLocalData = useCallback((nextData: HubData) => {
    latestDataRef.current = nextData;
    setData(nextData);
    saveLocalHubData(nextData);
  }, []);

  // Modals
  const [passcodeModalOpen, setPasscodeModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [gasGuideOpen, setGasGuideOpen] = useState(false);
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
  const lastPullAtRef = useRef(0);
  const scriptUrlRef = useRef(scriptUrl);
  scriptUrlRef.current = scriptUrl;

  const hasOpenModalRef = useRef(false);
  hasOpenModalRef.current = Boolean(
    passcodeModalOpen ||
      profileModalOpen ||
      linkModalOpen ||
      gasGuideOpen ||
      deleteTarget ||
      resetConfirmOpen
  );

  // Background Cloud Sync on initial load & tab resume if GOOGLE_SCRIPT_URL / DEFAULT_SCRIPT_URL is configured
  const pullCloudData = useCallback(
    async (urlToUse: string, silent = true) => {
      const cleanUrl = urlToUse.trim();
      if (!cleanUrl || isPullingRef.current || isSavingRef.current) return;

      isPullingRef.current = true;
      lastPullAtRef.current = Date.now();
      setSyncStatus({ state: 'syncing', message: 'กำลังซิงก์ข้อมูลจาก Google Sheets...' });

      try {
        const cloudData = await fetchFromGoogleSheets(cleanUrl);
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
        setSyncStatus({
          state: 'error',
          message: 'เชื่อมต่อ Google Sheets ไม่สำเร็จ (ใช้ข้อมูลในเครื่อง)',
        });
        if (!silent) showNotice('ดึงข้อมูลจาก Cloud ไม่สำเร็จ กรุณาตรวจสอบ URL');
      } finally {
        isPullingRef.current = false;
      }
    },
    [commitLocalData, showNotice]
  );

  useEffect(() => {
    const initialUrl = (scriptUrlRef.current || loadScriptUrl()).trim();
    if (initialUrl) {
      pullCloudData(initialUrl, true);
    }

    const handleResumeSync = () => {
      if (document.visibilityState === 'hidden') return;
      if (hasOpenModalRef.current || isSavingRef.current || isPullingRef.current) return;
      if (Date.now() - lastPullAtRef.current < 500) return;

      const activeUrl = (scriptUrlRef.current || loadScriptUrl()).trim();
      if (activeUrl) {
        pullCloudData(activeUrl, true);
      }
    };

    document.addEventListener('visibilitychange', handleResumeSync);
    window.addEventListener('focus', handleResumeSync);
    return () => {
      document.removeEventListener('visibilitychange', handleResumeSync);
      window.removeEventListener('focus', handleResumeSync);
    };
  }, [pullCloudData]);

  // Persist to localStorage & optionally push to Google Sheets directly with the passed object
  const persistChanges = useCallback(
    async (
      nextData: HubData,
      pushCloud: boolean,
      overrideScriptUrl?: string
    ): Promise<PersistResult> => {
      const stamped: HubData = {
        ...nextData,
        updatedAt: new Date().toISOString(),
      };
      commitLocalData(stamped);

      const activeUrl = (overrideScriptUrl ?? (scriptUrl || loadScriptUrl())).trim();

      if (pushCloud && activeUrl) {
        isSavingRef.current = true;
        setSyncStatus({ state: 'syncing', message: 'กำลังบันทึกขึ้น Google Sheets...' });
        try {
          await saveToGoogleSheets(activeUrl, stamped);
          lastPullAtRef.current = Date.now();
          setSyncStatus({
            state: 'synced',
            message: 'บันทึกลง Cloud แล้ว',
            lastSyncedAt: new Date().toISOString(),
          });
          showNotice('บันทึกและซิงก์ข้อมูลขึ้น Google Sheets สำเร็จ');
          return { ok: true, cloudSynced: true, hasScriptUrl: true };
        } catch {
          setSyncStatus({
            state: 'error',
            message: 'บันทึกในเครื่องแล้ว (ซิงก์ Cloud ไม่สำเร็จ)',
          });
          showNotice('บันทึกในเครื่องแล้ว แต่ไม่สามารถส่งไป Google Sheets ได้');
          return { ok: false, cloudSynced: false, hasScriptUrl: true };
        } finally {
          isSavingRef.current = false;
        }
      } else if (pushCloud) {
        showNotice('บันทึกข้อมูลลงในเครื่องเรียบร้อยแล้ว');
      }

      return { ok: true, cloudSynced: false, hasScriptUrl: Boolean(activeUrl) };
    },
    [commitLocalData, scriptUrl, showNotice]
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
    commitLocalData({ ...latestDataRef.current, theme: themeId });
  };

  const handleUpdateCustomTheme = (nextCustom: CustomThemeColors) => {
    commitLocalData({
      ...latestDataRef.current,
      theme: 'custom',
      customTheme: nextCustom,
    });
  };

  const handleUpdateMusicConfig = (partial: Partial<MusicConfig>) => {
    const base = latestDataRef.current;
    commitLocalData({
      ...base,
      music: { ...base.music, ...partial },
    });
  };

  const handleChangePasscode = async (
    newPasscode: string,
    draftUrl?: string
  ): Promise<PersistResult> => {
    const cleanPasscode = newPasscode.trim();
    const resolvedUrl = (draftUrl || scriptUrl || loadScriptUrl()).trim();

    if (draftUrl && draftUrl.trim() && draftUrl.trim() !== scriptUrl.trim()) {
      setScriptUrl(resolvedUrl);
      saveScriptUrl(resolvedUrl);
    }

    // Build payload directly with `passcode: cleanPasscode` without reading stale React state
    const payloadWithNewPasscode: HubData = {
      ...latestDataRef.current,
      passcode: cleanPasscode,
    };

    return persistChanges(payloadWithNewPasscode, true, resolvedUrl);
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

  const handleSaveScriptUrl = (url: string) => {
    const trimmed = url.trim();
    saveScriptUrl(trimmed);
    const effective = loadScriptUrl();
    setScriptUrl(effective);
    if (effective) {
      showNotice(trimmed ? 'บันทึก GOOGLE_SCRIPT_URL แล้ว' : 'ใช้ค่าเริ่มต้น DEFAULT_SCRIPT_URL แล้ว');
      pullCloudData(effective, true);
    } else {
      setSyncStatus({ state: 'idle', message: '' });
      showNotice('ล้างการเชื่อมต่อ Google Sheets แล้ว');
    }
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
    const html = buildStandaloneHtml(latestDataRef.current, scriptUrl);
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
      const resized = await resizeImageToDataUrl(file, 400, 'png');
      const current = latestDataRef.current;
      const updated: HubData = {
        ...current,
        profileImage: resized,
        iosConfig: {
          ...current.iosConfig,
          appIcon: resized,
        },
      };
      await persistChanges(updated, true);
      showNotice('อัปเดตรูปโลโก้และไอคอน iOS เรียบร้อย');
    } catch {
      showNotice('ไม่สามารถอัปโหลดรูปโลโก้ได้');
    }
  };

  return (
    <div
      className="min-h-screen w-full transition-colors duration-200"
      style={{ backgroundColor: palette.bg, color: palette.text }}
    >
      {/* Top-Right Unlock / Admin Controls */}
      <header className="mx-auto flex w-full max-w-4xl items-center justify-end gap-2 px-4 pt-4 sm:px-6 sm:pt-5">
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
              onClick={() => persistChanges(data, true)}
              disabled={syncStatus.state === 'syncing'}
              className="flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-85 disabled:opacity-60 sm:text-sm"
              style={{
                backgroundColor: palette.cardBg,
                border: `1px solid ${palette.cardBorder}`,
                color: palette.text,
              }}
            >
              {syncStatus.state === 'syncing' ? (
                <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CloudUpload className="h-4 w-4" style={{ color: palette.accent }} aria-hidden="true" />
              )}
              <span>{scriptUrl ? 'บันทึก & ซิงก์ Cloud' : 'บันทึกข้อมูล'}</span>
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
              src={data.profileImage}
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
                <span>เปลี่ยนรูปโลโก้ (400px)</span>
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
            onSaveTheme={() => persistChanges(data, true)}
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

        {/* Admin-Only Music Settings Bar */}
        {isAdmin && (
          <MusicSettingsBar
            config={data.music}
            palette={palette}
            onSaveMusic={(updatedMusic) => {
              persistChanges({ ...data, music: updatedMusic }, true);
            }}
          />
        )}

        {/* System Settings & Backup Panel — STRICTLY Admin Mode Only */}
        {isAdmin && (
          <SystemSettingsPanel
            data={data}
            scriptUrl={scriptUrl}
            syncStatus={syncStatus}
            palette={palette}
            onSaveScriptUrl={handleSaveScriptUrl}
            onPullFromCloud={() => pullCloudData(scriptUrl, false)}
            onOpenAppsScriptGuide={() => setGasGuideOpen(true)}
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

      <AppsScriptModal
        open={gasGuideOpen}
        palette={palette}
        onClose={() => setGasGuideOpen(false)}
      />

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
