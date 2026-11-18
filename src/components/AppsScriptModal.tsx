import React, { useState } from 'react';
import { Check, Copy, FileCode2, X } from 'lucide-react';
import type { ThemePalette } from '../types/hub';
import { buildGoogleAppsScriptCode } from '../utils/hubLogic';

interface AppsScriptModalProps {
  open: boolean;
  palette: ThemePalette;
  onClose: () => void;
}

export const AppsScriptModal: React.FC<AppsScriptModalProps> = ({
  open,
  palette,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const scriptCode = buildGoogleAppsScriptCode();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(scriptCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback copy via temporary textarea
      const textarea = document.createElement('textarea');
      textarea.value = scriptCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gas-guide-title"
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl p-6 shadow-xl"
        style={{
          backgroundColor: palette.cardBg,
          border: `1px solid ${palette.cardBorder}`,
          color: palette.text,
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: palette.accentSoft, color: palette.accent }}
            >
              <FileCode2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="gas-guide-title" className="text-base font-bold sm:text-lg">
                คู่มือเชื่อมต่อ Google Sheets (Apps Script)
              </h2>
              <p className="text-xs" style={{ color: palette.textMuted }}>
                ใช้ Google Sheets เป็นฐานข้อมูล Cloud ฟรี ซิงก์ได้ทุกอุปกรณ์
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดคู่มือ Apps Script"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:opacity-70"
            style={{ color: palette.textMuted }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ol className="mb-5 space-y-2 rounded-2xl p-4 text-xs leading-relaxed sm:text-sm" style={{ backgroundColor: palette.bg }}>
          <li>
            <strong>1. สร้าง Google Sheet ใหม่</strong> ที่{' '}
            <span className="underline">sheets.google.com</span>
          </li>
          <li>
            <strong>2. เปิดเมนู</strong> <code>Extensions (ส่วนขยาย)</code> &rarr;{' '}
            <code>Apps Script</code>
          </li>
          <li>
            <strong>3. ลบโค้ดเดิมทั้งหมด</strong> แล้วคัดลอกโค้ดสำเร็จรูปด้านล่างไปวางแทนที่ จากนั้นกดบันทึก
          </li>
          <li>
            <strong>4. กดปุ่ม Deploy (ทำให้ใช้งานได้)</strong> &rarr;{' '}
            <code>New deployment</code> &rarr; เลือกประเภท <code>Web app</code>
          </li>
          <li>
            <strong>5. ตั้งค่าสิทธิ์สำคัญ:</strong> Execute as = <code>Me</code> และ Who has access ={' '}
            <code>Anyone (ทุกคน)</code> แล้วกด Deploy
          </li>
          <li>
            <strong>6. คัดลอก Web App URL</strong> (ขึ้นต้นด้วย <code>https://script.google.com/macros/s/...</code>) มาวางในช่อง GOOGLE_SCRIPT_URL ของหน้าตั้งค่า
          </li>
        </ol>

        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold" style={{ color: palette.textMuted }}>
            โค้ด Google Apps Script (Code.gs)
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex min-h-[38px] items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-transform active:scale-95"
            style={{ backgroundColor: palette.accent, color: palette.accentText }}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'คัดลอกโค้ดแล้ว!' : 'คัดลอกโค้ดทั้งหมด'}
          </button>
        </div>

        <pre
          className="max-h-64 overflow-x-auto overflow-y-auto rounded-2xl p-4 text-left font-mono text-[11px] leading-relaxed"
          style={{
            backgroundColor: palette.bg,
            border: `1px solid ${palette.cardBorder}`,
            color: palette.text,
          }}
        >
          <code>{scriptCode}</code>
        </pre>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-full px-6 py-2 text-sm font-semibold"
            style={{ backgroundColor: palette.bgSoft, color: palette.text }}
          >
            เข้าใจแล้ว ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
