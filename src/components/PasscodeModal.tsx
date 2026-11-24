import React, { useEffect, useRef, useState } from 'react';
import { KeyRound, Lock, X } from 'lucide-react';
import type { ThemePalette } from '../types/hub';
import { validatePasscode } from '../utils/hubLogic';

interface PasscodeModalProps {
  open: boolean;
  expectedPasscode: string;
  palette: ThemePalette;
  onUnlock: () => void;
  onClose: () => void;
}

export const PasscodeModal: React.FC<PasscodeModalProps> = ({
  open,
  expectedPasscode,
  palette,
  onUnlock,
  onClose,
}) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setInput('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (validatePasscode(input, expectedPasscode)) {
      setError('');
      onUnlock();
    } else {
      setError('รหัส Passcode ไม่ถูกต้อง ลองใหม่อีกครั้ง');
      setInput('');
      inputRef.current?.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="passcode-modal-title"
    >
      <div
        className="w-full max-w-sm rounded-3xl p-6 shadow-xl"
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
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="passcode-modal-title" className="text-base font-bold">
                ปลดล็อกโหมดแก้ไข
              </h2>
              <p className="text-xs" style={{ color: palette.textMuted }}>
                กรอกรหัส Passcode (ค่าเริ่มต้น 1234)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างใส่รหัส"
            className="flex h-10 w-10 items-center justify-center rounded-full transition-opacity hover:opacity-70"
            style={{ color: palette.textMuted }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-passcode-input" className="sr-only">
              รหัส Passcode
            </label>
            <input
              ref={inputRef}
              id="admin-passcode-input"
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (error) setError('');
              }}
              placeholder="กรอกรหัสผ่าน..."
              className="w-full rounded-2xl px-4 py-3 text-center text-lg font-bold tracking-[0.35em] outline-none transition-all focus:ring-2"
              style={{
                backgroundColor: palette.bg,
                border: `1px solid ${error ? '#DC2626' : palette.cardBorder}`,
                color: palette.text,
              }}
            />
            {error && (
              <p role="alert" className="mt-2 text-center text-xs font-medium text-red-600">
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ backgroundColor: palette.bgSoft, color: palette.text }}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-transform active:scale-95"
              style={{ backgroundColor: palette.accent, color: palette.accentText }}
            >
              <Lock className="h-4 w-4" aria-hidden="true" />
              ปลดล็อก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
