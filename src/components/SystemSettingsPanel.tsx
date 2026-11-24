import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileJson,
  KeyRound,
  RefreshCw,
  RotateCcw,
  Upload,
} from 'lucide-react';
import type { HubData, SyncStatus, ThemePalette } from '../types/hub';

export interface PersistResult {
  ok: boolean;
  cloudSynced: boolean;
}

interface SystemSettingsPanelProps {
  data: HubData;
  syncStatus: SyncStatus;
  palette: ThemePalette;
  onChangePasscode: (newPasscode: string) => Promise<PersistResult>;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  onDownloadHtml: () => void;
  onRequestReset: () => void;
}

export const SystemSettingsPanel: React.FC<SystemSettingsPanelProps> = ({
  syncStatus,
  palette,
  onChangePasscode,
  onExportJson,
  onImportJson,
  onDownloadHtml,
  onRequestReset,
}) => {
  const [newPass, setNewPass] = useState('');
  const [passMessage, setPassMessage] = useState('');
  const [passError, setPassError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePassSubmit = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    const cleaned = newPass.trim();
    if (cleaned.length < 4) {
      setPassError(true);
      setPassMessage('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
      return;
    }

    // Optimistic UI: clear input and confirm local save immediately without blocking
    setNewPass('');
    setPassError(false);
    setPassMessage('บันทึกรหัสใหม่แล้ว กำลังซิงก์ขึ้น Google Sheets...');

    const result = await onChangePasscode(cleaned);
    if (result.cloudSynced) {
      setPassError(false);
      setPassMessage('เปลี่ยนรหัส Passcode และซิงก์ขึ้น Google Sheets เรียบร้อยแล้ว');
    } else {
      setPassError(true);
      setPassMessage('บันทึกรหัสใหม่ลงในเครื่องแล้ว แต่ไม่สามารถซิงก์ขึ้น Google Sheets ได้');
    }
    setTimeout(() => setPassMessage(''), 4500);
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
      <div
        className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b pb-4"
        style={{ borderColor: palette.cardBorder }}
      >
        <div>
          <h2 className="text-base font-bold sm:text-lg">ตั้งค่าระบบและสำรองข้อมูล</h2>
          <p className="text-xs" style={{ color: palette.textMuted }}>
            กล่องนี้แสดงเฉพาะในโหมดแก้ไขเท่านั้น ผู้เข้าชมทั่วไปจะมองไม่เห็น
          </p>
        </div>

        {/* Sync Status Label */}
        {syncStatus.message && (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold"
            style={{
              color:
                syncStatus.state === 'error'
                  ? '#DC2626'
                  : syncStatus.state === 'synced'
                    ? palette.accent
                    : palette.textMuted,
            }}
          >
            {syncStatus.state === 'syncing' ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : syncStatus.state === 'synced' ? (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : syncStatus.state === 'error' ? (
              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
            ) : null}
            {syncStatus.message}
          </span>
        )}
      </div>

      {/* Passcode Change + Backup / Export Tools Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
              className="min-h-[44px] w-full min-w-0 flex-1 rounded-full px-4 text-xs outline-none sm:text-sm"
              style={{
                backgroundColor: palette.bg,
                border: `1px solid ${palette.cardBorder}`,
                color: palette.text,
              }}
            />
            <button
              type="button"
              onClick={handlePassSubmit}
              className="min-h-[44px] shrink-0 whitespace-nowrap rounded-full px-4 text-xs font-semibold transition-transform active:scale-95"
              style={{ backgroundColor: palette.accent, color: palette.accentText }}
            >
              เปลี่ยนรหัส
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
