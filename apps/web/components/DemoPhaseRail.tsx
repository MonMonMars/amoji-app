'use client';
// Small one-tap demo chips above the chat composer — horizontal scroll so
// iPhone users can browse abilities without typing or talking. Pointer drag
// scrolls on desktop / iOS; a short drag still counts as a chip tap.
//
// Visible thin scrollbar + edge chevrons so users discover horizontal overflow.
//
// IMPORTANT: never setPointerCapture on the rail during a chip press.
// Capturing on the parent retargets pointerup away from the button, and
// Chrome then drops the click — every phase chip looked dead.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  asDemoLang,
  demoPhasePrompt,
  newDemoPhaseOrderSeed,
  shuffledDemoPhaseButtons,
  type DemoPhaseId,
} from '../lib/demo-phase';
import { loadPrefs, t } from '../lib/prefs';

const RAIL_ARIA: Record<string, string> = {
  en: 'Try what she can do',
  yue: '試吓佢識做咩',
  zh: '试试她会做什么',
  ja: 'できることを試す',
};

/** Ignore pointer jitter so a real chip tap still fires onClick (iPhone + mouse). */
const DRAG_CLICK_PX = 18;

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="relative z-10 h-5 w-5 sm:h-6 sm:w-6"
      aria-hidden="true"
    >
      {dir === 'left' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
    </svg>
  );
}

export default function DemoPhaseRail({
  lang,
  disabled,
  orderSeed,
  onPick,
  onWarmStory,
}: {
  lang: string;
  disabled?: boolean;
  /** Per chat-room entry — reshuffles chip order (defaults to a fresh seed). */
  orderSeed?: number;
  onPick: (prompt: string, id: DemoPhaseId) => void;
  /** Predownload classic fairy tales on Story chip hover / focus. */
  onWarmStory?: () => void;
}) {
  const L = asDemoLang(lang);
  const uiLang = loadPrefs().lang;
  const railRef = useRef<HTMLDivElement>(null);
  /** Per-chip tap count so repeat presses rotate prompt facets. */
  const tapCountRef = useRef<Partial<Record<DemoPhaseId, number>>>({});
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    scrollLeft: number;
    moved: boolean;
    captured: boolean;
  } | null>(null);
  // Survives past pointerup so the following click can be suppressed.
  const skipClickRef = useRef(false);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const buttons = useMemo(
    () => shuffledDemoPhaseButtons(orderSeed ?? newDemoPhaseOrderSeed()),
    [orderSeed],
  );

  const updateScrollHints = () => {
    const el = railRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  const nudge = (dir: number) => {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.72, behavior: 'smooth' });
  };

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateScrollHints);
    ro.observe(el);
    el.addEventListener('scroll', updateScrollHints, { passive: true });
    window.addEventListener('resize', updateScrollHints);
    const mo = new MutationObserver(updateScrollHints);
    mo.observe(el, { childList: true });
    updateScrollHints();
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', updateScrollHints);
      window.removeEventListener('resize', updateScrollHints);
      mo.disconnect();
    };
  }, [buttons]);

  const arrow = (enabled: boolean) =>
    'fx-press-lite absolute top-[calc(50%-0.5rem)] z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full ' +
    'border border-white/35 bg-black/70 text-white shadow-[0_4px_14px_rgba(0,0,0,0.55)] backdrop-blur-sm transition active:scale-95 sm:h-10 sm:w-10 sm:border-2 sm:border-white/40 ' +
    (enabled
      ? 'cursor-pointer hover:border-white hover:bg-black/85 '
      : 'pointer-events-none opacity-25');

  return (
    <div
      role="group"
      data-testid="demo-phase-rail"
      aria-label={RAIL_ARIA[L] ?? RAIL_ARIA.en}
      className="relative z-20 w-full min-w-0"
    >
      <div
        ref={railRef}
        role="list"
        className="demo-phase-rail-scroll flex w-full min-w-0 cursor-grab gap-1.5 overflow-x-auto overscroll-x-contain scroll-smooth px-0.5 pb-1.5 pt-0.5 active:cursor-grabbing [touch-action:pan-x] [-webkit-overflow-scrolling:touch]"
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          const el = railRef.current;
          if (!el) return;
          skipClickRef.current = false;
          dragRef.current = {
            pointerId: e.pointerId,
            startX: e.clientX,
            scrollLeft: el.scrollLeft,
            moved: false,
            captured: false,
          };
          // Do NOT capture yet — wait until a real drag. Immediate capture on the
          // rail steals pointerup from chip buttons and kills onClick in Chrome.
        }}
        onPointerMove={(e) => {
          const drag = dragRef.current;
          const el = railRef.current;
          if (!drag || !el || drag.pointerId !== e.pointerId) return;
          const dx = e.clientX - drag.startX;
          if (Math.abs(dx) >= DRAG_CLICK_PX) {
            drag.moved = true;
            skipClickRef.current = true;
            if (!drag.captured) {
              drag.captured = true;
              try {
                el.setPointerCapture(e.pointerId);
              } catch {
                /* capture optional on some WebViews */
              }
            }
          }
          if (drag.moved) {
            el.scrollLeft = drag.scrollLeft - dx;
          }
        }}
        onPointerUp={(e) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== e.pointerId) return;
          // Only suppress the following click after a real scroll drag.
          skipClickRef.current = drag.moved;
          const wasCaptured = drag.captured;
          dragRef.current = null;
          if (wasCaptured) {
            try {
              railRef.current?.releasePointerCapture(e.pointerId);
            } catch {
              /* ignore */
            }
          }
          updateScrollHints();
        }}
        onPointerCancel={() => {
          dragRef.current = null;
          skipClickRef.current = false;
        }}
      >
        {buttons.map((btn) => (
          <button
            key={btn.id}
            type="button"
            role="listitem"
            data-demo-phase={btn.id}
            disabled={disabled}
            onPointerEnter={() => {
              if (btn.id === 'story') onWarmStory?.();
            }}
            onFocus={() => {
              if (btn.id === 'story') onWarmStory?.();
            }}
            onClick={() => {
              // A drag-scroll must not fire the chip under the pointer.
              if (skipClickRef.current) {
                skipClickRef.current = false;
                return;
              }
              if (btn.id === 'story') onWarmStory?.();
              const n = tapCountRef.current[btn.id] ?? 0;
              tapCountRef.current[btn.id] = n + 1;
              onPick(demoPhasePrompt(btn.id, L, n), btn.id);
            }}
            className="pointer-events-auto relative z-20 shrink-0 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[11px] font-medium leading-none text-white/85 transition active:scale-95 enabled:hover:border-white/30 enabled:hover:bg-black/60 disabled:opacity-40"
          >
            {btn.label[L]}
          </button>
        ))}
      </div>
      {(canLeft || canRight) && (
        <>
          <button
            type="button"
            onClick={() => nudge(-1)}
            aria-label={t(uiLang, 'scrollLeft')}
            title={t(uiLang, 'scrollLeft')}
            disabled={!canLeft}
            className={`${arrow(canLeft)} left-0`}
          >
            <Chevron dir="left" />
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
            aria-label={t(uiLang, 'scrollRight')}
            title={t(uiLang, 'scrollRight')}
            disabled={!canRight}
            className={`${arrow(canRight)} right-0`}
          >
            <Chevron dir="right" />
          </button>
        </>
      )}
    </div>
  );
}