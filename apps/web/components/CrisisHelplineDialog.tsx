'use client';
/**
 * Warning popup when the crisis guard fires.
 * Shows location-appropriate 「即刻搵人傾」 numbers; Escape / tap dismisses.
 * The LLM path is already blocked by `guardCompanionTurn` before this opens.
 */
import { useEffect, useId, useRef } from 'react';
import Link from 'next/link';
import { crisisCopy, type HelplineRegion } from '../lib/crisis';
import { t, type Lang } from '../lib/prefs';
import { useFocusTrap } from '../lib/use-focus-trap';
import { HelplineList } from './HelplineList';

export default function CrisisHelplineDialog({
  lang,
  region,
  onClose,
}: {
  lang: Lang;
  region: HelplineRegion;
  onClose: () => void;
}) {
  const copy = crisisCopy(lang);
  const panelRef = useFocusTrap<HTMLDivElement>(true);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onCloseRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      previousFocusRef.current?.focus?.();
    };
  }, []);

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[95] flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      data-testid="crisis-dialog-backdrop"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid="crisis-dialog"
        data-helpline-region={region}
        className="fx-sheet-in max-h-[min(88dvh,36rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-rose-400/30 bg-neutral-950/95 p-5 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-base font-semibold text-rose-50">
            {copy.popupTitle}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={copy.popupClose}
            className="ui-btn shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/70 hover:bg-white/20"
          >
            ×
          </button>
        </div>

        <p className="text-sm leading-relaxed text-rose-50/90">{copy.popupLead}</p>

        <h3 className="mt-4 text-sm font-semibold text-white">
          {t(lang, 'safetyHelplinesTitle')}
        </h3>
        <HelplineList region={region} testId="crisis-dialog-helplines" />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/rules#setup-safety-helplines"
            className="text-xs text-pink-200 underline-offset-4 hover:underline"
            onClick={onClose}
          >
            {t(lang, 'safetyOpenPage')}
          </Link>
          <button
            type="button"
            data-testid="crisis-dialog-close"
            onClick={onClose}
            className="ui-btn rounded-full border border-rose-200/30 bg-rose-500/20 px-4 py-2 text-xs font-medium text-rose-50"
          >
            {copy.popupClose}
          </button>
        </div>
      </div>
    </div>
  );
}
