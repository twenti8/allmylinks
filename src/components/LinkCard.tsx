import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import type { LinkItem, ThemePalette } from '../types/hub';
import { normalizeUrl } from '../utils/hubLogic';

interface LinkCardProps {
  link: LinkItem;
  index: number;
  total: number;
  isAdmin: boolean;
  palette: ThemePalette;
  onEdit: (link: LinkItem) => void;
  onDelete: (link: LinkItem) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
}

export const LinkCard: React.FC<LinkCardProps> = ({
  link,
  index,
  total,
  isAdmin,
  palette,
  onEdit,
  onDelete,
  onMove,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [link.icon]);

  const trimmedIcon = (link.icon || '').trim();
  const isImageSrc =
    !imgFailed &&
    (trimmedIcon.startsWith('data:') ||
      trimmedIcon.startsWith('http://') ||
      trimmedIcon.startsWith('https://') ||
      trimmedIcon.startsWith('/'));

  return (
    <div className="group flex flex-col gap-2">
      <a
        href={normalizeUrl(link.url)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={link.subtitle ? `${link.title} — ${link.subtitle}` : link.title}
        className="flex min-h-[68px] w-full items-center gap-3.5 rounded-full px-4 py-3 text-left transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.99]"
        style={{
          backgroundColor: palette.cardBg,
          border: `1px solid ${palette.cardBorder}`,
          boxShadow: palette.cardShadow,
          color: palette.text,
        }}
      >
        {/* Left circular icon / thumbnail */}
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-xl"
          style={{
            backgroundColor: palette.accentSoft,
            border: `1.5px solid ${palette.cardBorder}`,
          }}
        >
          {isImageSrc ? (
            <img
              src={link.icon}
              alt={link.title}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <span aria-hidden="true">{link.icon || '🔗'}</span>
          )}
        </div>

        {/* Middle title + optional subtitle */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-snug" style={{ color: palette.text }}>
            {link.title}
          </p>
          {link.subtitle && (
            <p className="mt-0.5 truncate text-xs" style={{ color: palette.textMuted }}>
              {link.subtitle}
            </p>
          )}
        </div>

        {/* Right unboxed category text + disclosure chevron */}
        <div className="flex shrink-0 items-center gap-2.5 pl-1">
          {link.category && (
            <span
              className="hidden text-xs font-medium sm:inline"
              style={{ color: palette.textMuted }}
            >
              {link.category}
            </span>
          )}
          <ChevronRight
            className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
            style={{ color: palette.accent }}
            aria-hidden="true"
          />
        </div>
      </a>

      {/* Admin Controls Row (Hidden completely in Public View) */}
      {isAdmin && (
        <div className="flex items-center justify-end gap-1.5 px-3">
          <button
            type="button"
            onClick={() => onMove(index, 'up')}
            disabled={index === 0}
            aria-label={`เลื่อน '${link.title}' ขึ้น`}
            className="flex h-9 w-9 items-center justify-center rounded-full text-xs transition-opacity disabled:opacity-30"
            style={{
              backgroundColor: palette.cardBg,
              border: `1px solid ${palette.cardBorder}`,
              color: palette.text,
            }}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMove(index, 'down')}
            disabled={index === total - 1}
            aria-label={`เลื่อน '${link.title}' ลง`}
            className="flex h-9 w-9 items-center justify-center rounded-full text-xs transition-opacity disabled:opacity-30"
            style={{
              backgroundColor: palette.cardBg,
              border: `1px solid ${palette.cardBorder}`,
              color: palette.text,
            }}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(link)}
            aria-label={`แก้ไข '${link.title}'`}
            className="flex h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold transition-opacity hover:opacity-80"
            style={{
              backgroundColor: palette.accentSoft,
              color: palette.accent,
            }}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            แก้ไข
          </button>
          <button
            type="button"
            onClick={() => onDelete(link)}
            aria-label={`ลบ '${link.title}'`}
            className="flex h-9 items-center gap-1 rounded-full bg-red-50 px-3 text-xs font-semibold text-red-700 transition-opacity hover:bg-red-100"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            ลบ
          </button>
        </div>
      )}
    </div>
  );
};
