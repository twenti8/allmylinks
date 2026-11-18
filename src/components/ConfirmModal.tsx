import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { ThemePalette } from '../types/hub';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  palette: ThemePalette;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'ยกเลิก',
  destructive = false,
  palette,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="w-full max-w-sm rounded-3xl p-6 shadow-xl"
        style={{
          backgroundColor: palette.cardBg,
          border: `1px solid ${palette.cardBorder}`,
          color: palette.text,
        }}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor: destructive ? '#FEE2E2' : palette.accentSoft,
                color: destructive ? '#B91C1C' : palette.accent,
              }}
            >
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 id="confirm-modal-title" className="text-base font-bold">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="ปิดหน้าต่างยืนยัน"
            className="flex h-9 w-9 items-center justify-center rounded-full transition-opacity hover:opacity-70"
            style={{ color: palette.textMuted }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-6 text-sm leading-relaxed" style={{ color: palette.textMuted }}>
          {message}
        </p>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] rounded-full px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{
              backgroundColor: palette.bgSoft,
              color: palette.text,
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[44px] rounded-full px-5 py-2 text-sm font-semibold text-white transition-transform active:scale-95"
            style={{
              backgroundColor: destructive ? '#DC2626' : palette.accent,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
