'use client';
// r282 in-chat idle picker. The owner asked for "a small button beside the
// character in the chat room, press and select one by one, give each of them
// a number C18, C16 etc."
//
// The button floats next to the companion canvas (right edge, mid height) so
// it is thumb-reachable on a Pixel/iPhone without touching the bottom chat
// controls. Tapping a row pins that idle immediately — the live avatar swaps
// in place, so tapping down the list compares poses one after another.
// "Auto rotation" clears the pin and returns to normal rotation.
//
// Persistence is the existing per-companion pin: `amoji.idlePick.v6` via
// saveIdlePick/clearIdlePick, so a pinned idle survives reload.

import { useEffect, useRef, useState } from 'react';
import { listIdlePickerRows, type IdlePickerRow } from '../lib/idle-chat-picker';
import { useFocusTrap } from '../lib/use-focus-trap';
import { t, type Lang } from '../lib/prefs';

function IdleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="4.5" r="2.2" />
      <path d="M12 7.2v7.3M12 9.4 7.8 12M12 9.4l4.2 2.6M12 14.5 9 20M12 14.5l3 5.5" strokeLinecap="round" />
    </svg>
  );
}

export function IdlePickerButton({
  lang,
  pinned,
  onClick,
}: {
  lang: Lang;
  pinned: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid="idle-picker-button"
      data-dev="ID1"
      onClick={onClick}
      title={t(lang, 'idlePickerOpen')}
      aria-label={t(lang, 'idlePickerOpen')}
      aria-haspopup="dialog"
      className={`ui-btn pointer-events-auto absolute right-[max(0.4rem,env(safe-area-inset-right))] top-[42%] z-20 flex h-9 w-9 items-center justify-center rounded-full border text-white/90 shadow-sm backdrop-blur-md hover:bg-black/50 sm:h-10 sm:w-10 ${
        pinned ? 'border-amber-300/60 bg-black/45 text-amber-100' : 'border-white/10 bg-black/30'
      }`}
    >
      <IdleGlyph />
      {pinned && (
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-300"
        />
      )}
    </button>
  );
}

export default function IdlePickerSheet({
  lang,
  pinnedClipId,
  onPick,
  onAuto,
  onClose,
}: {
  lang: Lang;
  pinnedClipId: string | null;
  onPick: (clipId: string) => void;
  onAuto: () => void;
  onClose: () => void;
}) {
  const [rows] = useState<IdlePickerRow[]>(() => listIdlePickerRows());
  const sheetRef = useFocusTrap<HTMLDivElement>(true);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fx-fade-in fixed inset-0 z-40 flex items-end bg-black/45 backdrop-blur-sm sm:items-center sm:justify-center"
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="amoji-idle-picker-title"
        tabIndex={-1}
        data-testid="idle-picker-sheet"
        onClick={(e) => e.stopPropagation()}
        className="fx-sheet-in flex max-h-[78dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-neutral-950/95 shadow-2xl sm:max-h-[80dvh] sm:max-w-md sm:rounded-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 id="amoji-idle-picker-title" className="text-base font-semibold text-white">
            {t(lang, 'idlePickerTitle')}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t(lang, 'close')}
            className="ui-btn rounded-full bg-white/10 px-3 py-1 text-sm text-white/70 hover:bg-white/20"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2">
          <button
            type="button"
            data-testid="idle-picker-auto"
            data-selected={pinnedClipId ? '0' : '1'}
            onClick={onAuto}
            aria-pressed={!pinnedClipId}
            className={`mb-1.5 flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left ${
              pinnedClipId
                ? 'border-white/10 bg-black/25 text-white/70 hover:bg-black/40'
                : 'border-amber-300/60 bg-amber-300/15 text-amber-100 ring-1 ring-amber-300/40'
            }`}
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{t(lang, 'idlePickerAuto')}</span>
              <span className="block text-[11px] text-white/55">{t(lang, 'idlePickerAutoDesc')}</span>
            </span>
            {!pinnedClipId && <span aria-hidden className="text-base">✓</span>}
          </button>

          <ul className="space-y-1.5">
            {rows.map((row) => {
              const selected = pinnedClipId === row.clipId;
              const meta = [
                row.source === 'owner' ? t(lang, 'idlePickerOwner') : t(lang, 'idlePickerNew'),
                row.planted ? t(lang, 'idlePickerPlanted') : t(lang, 'idlePickerFloating'),
              ];
              return (
                <li key={row.clipId}>
                  <button
                    type="button"
                    data-testid={`idle-picker-row-${row.label}`}
                    data-idle-picker-clip={row.clipId}
                    data-idle-picker-c={row.cId ?? ''}
                    data-selected={selected ? '1' : '0'}
                    disabled={!row.playable}
                    aria-pressed={selected}
                    onClick={() => onPick(row.clipId)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left ${
                      !row.playable
                        ? 'border-white/10 bg-black/20 text-white/30'
                        : selected
                          ? 'border-white/80 bg-white/15 text-white ring-1 ring-white/50'
                          : 'border-white/10 bg-black/25 text-white/85 hover:bg-black/40'
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`w-12 shrink-0 text-center font-mono text-[13px] font-bold leading-none ${
                        selected ? 'text-amber-100' : 'text-white/80'
                      }`}
                    >
                      {row.label}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold leading-tight">{row.shortName}</span>
                      <span className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] leading-tight text-white/50">
                        {meta.map((m) => (
                          <span key={m}>{m}</span>
                        ))}
                        {row.plantedAlternative && (
                          <span className="text-emerald-200/80">C16/C18 alternative</span>
                        )}
                      </span>
                    </span>
                    <span className="w-4 shrink-0 text-center text-base" aria-hidden>
                      {selected ? '✓' : ''}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
