'use client';
// Small one-tap demo chips above the chat composer — horizontal scroll so
// iPhone users can browse abilities without typing or talking. Pointer drag
// scrolls on desktop / iOS; a short drag still counts as a chip tap.

import { useRef } from 'react';
import { DEMO_PHASE_BUTTONS, asDemoLang, type DemoPhaseId } from '../lib/demo-phase';

const RAIL_ARIA: Record<string, string> = {
  en: 'Try what she can do',
  yue: '試吓佢識做咩',
  zh: '试试她会做什么',
  ja: 'できることを試す',
};

/** Ignore pointer jitter so a real chip tap still fires onClick (iPhone + mouse). */
const DRAG_CLICK_PX = 18;

export default function DemoPhaseRail({
  lang,
  disabled,
  onPick,
}: {
  lang: string;
  disabled?: boolean;
  onPick: (prompt: string, id: DemoPhaseId) => void;
}) {
  const L = asDemoLang(lang);
  const railRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    scrollLeft: number;
    moved: boolean;
  } | null>(null);
  // Survives past pointerup so the following click can be suppressed.
  const skipClickRef = useRef(false);

  return (
    <div
      ref={railRef}
      data-testid="demo-phase-rail"
      role="list"
      aria-label={RAIL_ARIA[L] ?? RAIL_ARIA.en}
      className="flex w-full min-w-0 cursor-grab gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 active:cursor-grabbing [scrollbar-width:none] [touch-action:pan-x] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
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
        };
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          /* capture optional on some WebViews */
        }
      }}
      onPointerMove={(e) => {
        const drag = dragRef.current;
        const el = railRef.current;
        if (!drag || !el || drag.pointerId !== e.pointerId) return;
        const dx = e.clientX - drag.startX;
        if (Math.abs(dx) >= DRAG_CLICK_PX) {
          drag.moved = true;
          skipClickRef.current = true;
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
        dragRef.current = null;
        try {
          railRef.current?.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }}
      onPointerCancel={() => {
        dragRef.current = null;
        skipClickRef.current = false;
      }}
    >
      {DEMO_PHASE_BUTTONS.map((btn) => (
        <button
          key={btn.id}
          type="button"
          role="listitem"
          data-demo-phase={btn.id}
          disabled={disabled}
          onClick={() => {
            // A drag-scroll must not fire the chip under the pointer.
            if (skipClickRef.current) {
              skipClickRef.current = false;
              return;
            }
            onPick(btn.prompt[L], btn.id);
          }}
          className="shrink-0 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[11px] font-medium leading-none text-white/85 transition active:scale-95 enabled:hover:border-white/30 enabled:hover:bg-black/60 disabled:opacity-40"
        >
          {btn.label[L]}
        </button>
      ))}
    </div>
  );
}
