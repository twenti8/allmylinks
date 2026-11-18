import React, { useEffect, useRef, useState } from 'react';
import {
  Cloud,
  CloudDownload,
  Download,
  FileCode2,
  FileJson,
  KeyRound,
  RotateCcw,
  Save,
  Upload,
} from 'lucide-react';
import type { HubData, SyncStatus, ThemePalette } from '../types/hub';

export interface PersistResult {
  ok: boolean;
  cloudSynced: boolean;
  hasScriptUrl: boolean;
}

interface SystemSettingsPanelProps {
  data: HubData;
  scriptUrl: string;
  syncStatus: SyncStatus;
  palette: ThemePalette;
  onSaveScriptUrl: (url: string) => void;
  onPullFromCloud: () => void;
  onOpenAppsScriptGuide: () => void;
  onChangePasscode: (newPasscode: string, draftUrl?: string) => Promise<PersistResult>;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  onDownloadHtml: () => void;
  onRequestReset: () => void;
}

export const SystemSettingsPanel: React.FC<SystemSettingsPanelProps> = ({
  scriptUrl,
  syncStatus,
  palette,
  onSaveScriptUrl,
  onPullFromCloud,
  onOpenAppsScriptGuide,
  onChangePasscode,
  onExportJson,
  onImportJson,
  onDownloadHtml,
  onRequestReset,
}) => {
  const [urlDraft, setUrlDraft] = useState(scriptUrl);
  const [newPass, setNewPass] = useState('');
  const [passMessage, setPassMessage] = useState('');
  const [passError, setPassError] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUrlDraft(scriptUrl);
  }, [scriptUrl]);

  const handleScriptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveScriptUrl(urlDraft);
  };

  const handlePassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newPass.trim();
    if (cleaned.length < 4) {
      setPassError(true);
      setPassMessage('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
      return;
    }

    setSavingPass(true);
    setPassError(false);
    setPassMessage('กำลังบันทึกและซิงก์รหัสผ่านใหม่...');

    try {
      const result = await onChangePasscode(cleaned, urlDraft.trim());
      setNewPass('');
      if (result.cloudSynced) {
        setPassError(false);
        setPassMessage('เปลี่ยนรหัส Passcode และซิงก์ขึ้น Google Sheets เรียบร้อยแล้ว');
      } else if (result.hasScriptUrl && !result.ok) {
        setPassError(true);
        setPassMessage('บันทึกรหัสใหม่ลงในเครื่องแล้ว แต่ไม่สามารถซิงก์ขึ้น Google Sheets ได้');
      } else {
        setPassError(false);
        setPassMessage('บันทึกรหัส Passcode ใหม่ลงในเครื่องเรียบร้อยแล้ว');
      }
    } finally {
      setSavingPass(false);
      setTimeout(() => setPassMessage(''), 4500);
    }
  };

  return (
    <section
      aria-label="ตั้งค่าระบบและสำรองข้อมูล"
      className="mt-10 w-full rounded-3xl p-5 sm:p-7"
      style={{
        backgroundColor: palette.cardBg,
        border: `1px solid ${palette.cardBorder}`,
        boxShadow: palette.cardShadow,
        color: palette.text,
      }}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold sm:text-lg">ตั้งค่าระบบและสำรองข้อมูล</h2>
          <p className="text-xs" style={{ color: palette.textMuted }}>
            กล่องนี้แสดงเฉพาะในโหมดแก้ไขเท่านั้น ผู้เข้าชมทั่วไปจะมองไม่เห็น
          </p>
        </div>

        {/* Sync Status Label */}
        {syncStatus.message && (
          <span
            className="text-xs font-semibold"
            style={{
              color:
                syncStatus.state === 'error'
                  ? '#DC2626'
                  : syncStatus.state === 'synced'
                    ? palette.accent
                    : palette.textMuted,
            }}
          >
            {syncStatus.message}
          </span>
        )}
      </div>

      {/* Google Sheets Sync Section */}
      <div className="space-y-4 border-b pb-6" style={{ borderColor: palette.cardBorder }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Cloud className="h-4 w-4" style={{ color: palette.accent }} aria-hidden="true" />
            <span>เชื่อมต่อฐานข้อมูล Google Sheets</span>
          </div>
          <button
            type="button"
            onClick={onOpenAppsScriptGuide}
            className="flex min-h-[38px] items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-opacity hover:opacity-85"
            style={{ backgroundColor: palette.accentSoft, color: palette.accent }}
          >
            <FileCode2 className="h-3.5 w-3.5" aria-hidden="true" />
            คู่มือและคัดลอกโค้ด Apps Script
          </button>
        </div>

        <form onSubmit={handleScriptSubmit} className="flex flex-col gap-2.5 sm:flex-row">
          <label htmlFor="google-script-url-input" className="sr-only">
            GOOGLE_SCRIPT_URL
          </label>
          <input
            id="google-script-url-input"
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="วางลิงก์ https://script.google.com/macros/s/.../exec"
            className="min-h-[44px] flex-1 rounded-full px-4 text-xs outline-none focus:ring-2 sm:text-sm"
            style={{
              backgroundColor: palette.bg,
              border: `1px solid ${palette.cardBorder}`,
              color: palette.text,
            }}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-xs font-semibold transition-transform active:scale-95 sm:flex-initial"
              style={{ backgroundColor: palette.accent, color: palette.accentText }}
            >
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              บันทึก URL
            </button>
            <button
              type="button"
              onClick={onPullFromCloud}
              disabled={!urlDraft.trim() || syncStatus.state === 'syncing'}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-xs font-semibold transition-opacity disabled:opacity-40 sm:flex-initial"
              style={{ backgroundColor: palette.bgSoft, color: palette.text }}
            >
              <CloudDownload className="h-3.5 w-3.5" aria-hidden="true" />
              ดึงข้อมูลจาก Cloud
            </button>
          </div>
        </form>
      </div>

      {/* Passcode Change + Backup / Export Tools Grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Change Passcode */}
        <form onSubmit={handlePassSubmit} className="min-w-0 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold">
            <KeyRound className="h-4 w-4 shrink-0" style={{ color: palette.accent }} aria-hidden="true" />
            <span>เปลี่ยนรหัสผ่าน Passcode</span>
          </div>
          <div className="flex min-w-0 gap-2">
            <label htmlFor="new-passcode-input" className="sr-only">
              รหัส Passcode ใหม่
            </label>
            <input
              id="new-passcode-input"
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="รหัสใหม่ (4 ตัวขึ้นไป)"
              disabled={savingPass}
              className="min-h-[44px] w-full min-w-0 flex-1 rounded-full px-4 text-xs outline-none sm:text-sm"
              style={{
                backgroundColor: palette.bg,
                border: `1px solid ${palette.cardBorder}`,
                color: palette.text,
              }}
            />
            <button
              type="submit"
              disabled={savingPass}
              className="min-h-[44px] shrink-0 whitespace-nowrap rounded-full px-4 text-xs font-semibold transition-transform active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: palette.accent, color: palette.accentText }}
            >
              {savingPass ? 'กำลังบันทึก...' : 'เปลี่ยนรหัส'}
            </button>
          </div>
          {passMessage && (
            <p
              className="text-xs font-medium"
              style={{ color: passError ? '#DC2626' : palette.accent }}
            >
              {passMessage}
            </p>
          )}
        </form>

        {/* Backup & Export Actions */}
        <div className="space-y-3">
          <div className="text-sm font-bold">สำรองข้อมูลและส่งออกไฟล์</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onExportJson}
              className="flex min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl px-3 text-xs font-semibold transition-opacity hover:opacity-85"
              style={{ backgroundColor: palette.bg, border: `1px solid ${palette.cardBorder}` }}
            >
              <FileJson className="h-4 w-4 shrink-0" style={{ color: palette.accent }} aria-hidden="true" />
              Export JSON
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl px-3 text-xs font-semibold transition-opacity hover:opacity-85"
              style={{ backgroundColor: palette.bg, border: `1px solid ${palette.cardBorder}` }}
            >
              <Upload className="h-4 w-4 shrink-0" style={{ color: palette.accent }} aria-hidden="true" />
              Import JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImportJson(file);
                e.target.value = '';
              }}
            />

            <button
              type="button"
              onClick={onDownloadHtml}
              className="flex min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl px-3 text-xs font-semibold transition-opacity hover:opacity-85"
              style={{ backgroundColor: palette.bg, border: `1px solid ${palette.cardBorder}` }}
            >
              <Download className="h-4 w-4 shrink-0" style={{ color: palette.accent }} aria-hidden="true" />
              โหลดไฟล์ HTML
            </button>

            <button
              type="button"
              onClick={onRequestReset}
              className="flex min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl bg-red-50 px-3 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
            >
              <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
              รีเซ็ตค่าเริ่มต้น
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
