'use client';
// Curated idle picks (rail #1..N, not full library #). Tap = pin. Right-click /
// long-press = toggle enable (on/off for rotation). Defaults stay rail #1+#2.
// Chat-room only: multi-column CSS grid so every button fits without scrolling
// (Mon: side-rail overflow scroll does not work).
//
// The toggle used to be pointer-only: long-press was advertised in the tooltip
// but never wired (on iPhone a long press raises the callout instead), and a
// keyboard user had no way to reach it at all — WCAG 2.1.1 (keyboard). Both are
// handled now: a real long-press timer plus Alt/Shift+Enter and the context-menu
// key, and the label announces ON/OFF so the state change is not colour-only.

import { useEffect, useRef, useState } from 'react';
import { IDLE_CLIP_OPTIONS } from '../lib/idle-clips';
import { isIdleEnabled, listEnabledNums, setIdleEnabled } from '../lib/idle-enabled';
import { idlePickFor, isDefaultIdleClip, saveIdlePick } from '../lib/idle-pick';

/** How long a press must be held before it counts as a toggle, not a tap. */
const LONG_PRESS_MS = 500;
/** Movement that cancels a long press (finger/mouse is scrolling, not holding). */
const MOVE_CANCEL_PX = 12;

export default function IdlePickRails({
  characterId,
  onPick,
}: {
  characterId: string;
  onPick?: (clipId: string) => void;
}) {
  // null / [] until localStorage sync — avoid default-chip flash then jump to saved pick.
  const [picked, setPicked] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<number[]>([]);
  const [ready, setReady] = useState(false);

  // Long-press bookkeeping. A ref, because a re-render mid-press must not cancel it.
  const holdRef = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null);
  /** Set once a long press fires, so the following click does not also pin the clip. */
  const suppressClickRef = useRef(false);

  useEffect(() => {
    setPicked(idlePickFor(characterId));
    setEnabled(listEnabledNums());
    setReady(true);
  }, [characterId]);

  const clearHold = () => {
    if (holdRef.current) {
      clearTimeout(holdRef.current.timer);
      holdRef.current = null;
    }
  };

  useEffect(() => clearHold, []);

  const tap = (id: string, playable: boolean) => {
    if (!playable || !ready) return;
    const saved = saveIdlePick(characterId, id);
    setPicked(saved);
    if (saved) onPick?.(saved);
  };

  const toggle = (railNum: number) => {
    if (!ready) return;
    setEnabled(setIdleEnabled(railNum, !isIdleEnabled(railNum)));
  };

  const startHold = (railNum: number, x: number, y: number) => {
    if (!ready) return;
    clearHold();
    suppressClickRef.current = false;
    holdRef.current = {
      x,
      y,
      timer: setTimeout(() => {
        holdRef.current = null;
        suppressClickRef.current = true;
        toggle(railNum);
      }, LONG_PRESS_MS),
    };
  };

  const moveHold = (x: number, y: number) => {
    const h = holdRef.current;
    if (!h) return;
    if (Math.abs(x - h.x) > MOVE_CANCEL_PX || Math.abs(y - h.y) > MOVE_CANCEL_PX) clearHold();
  };

  const shown = IDLE_CLIP_OPTIONS.filter((item) => item.playable);

  return (
    <div
      data-testid="idle-rail-grid"
      data-ready={ready ? '1' : '0'}
      aria-busy={!ready}
      className={`pointer-events-none absolute bottom-[7.5rem] left-[max(2px,env(safe-area-inset-left))] top-14 z-20 flex w-[min(52vw,15.5rem)] min-h-0 flex-col sm:w-[min(44vw,17rem)] ${ready ? '' : 'opacity-0'}`}
    >
      <div
        data-testid="idle-rail-left"
        className="pointer-events-auto grid h-full min-h-0 max-h-full grid-cols-6 content-start gap-0.5 overflow-hidden sm:grid-cols-8" style={{ gridAutoRows: 'minmax(0, 1fr)' }}
      >
        {shown.map((item) => {
          const on = ready && picked === item.id;
          const en = ready && enabled.includes(item.num);
          const calm = isDefaultIdleClip(item.id);
          const title = [
            `rail #${item.num}`,
            `lib #${item.libNum}`,
            item.category,
            item.cId ?? 'app',
            item.name,
            en ? 'ON' : 'OFF',
            calm ? 'calm default' : null,
            'tap=use · hold/right-click=toggle',
            'Alt+Enter toggles',
          ].filter(Boolean).join(' · ');
          return (
            <button
              key={item.num}
              type="button"
              aria-label={`Idle rail #${item.num} ${item.name}, ${en ? 'enabled' : 'disabled'}`}
              aria-keyshortcuts="Alt+Enter"
              title={title}
              aria-pressed={ready ? on : undefined}
              disabled={!ready}
              data-dev={`I${item.num}`}
              data-idle-rail={item.num}
              data-idle-lib={item.libNum}
              data-c-id={item.cId ?? ''}
              onClick={() => {
                // A long press already toggled; do not also pin the clip.
                if (suppressClickRef.current) {
                  suppressClickRef.current = false;
                  return;
                }
                tap(item.id, item.playable);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                clearHold();
                toggle(item.num);
              }}
              onPointerDown={(e) => {
                // Mouse/pen only: touch gets pointerdown too, but the callout on
                // iOS is suppressed by CSS below; pointer events cover both.
                startHold(item.num, e.clientX, e.clientY);
              }}
              onPointerMove={(e) => moveHold(e.clientX, e.clientY)}
              onPointerUp={clearHold}
              onPointerCancel={clearHold}
              onPointerLeave={clearHold}
              onKeyDown={(e) => {
                // Keyboard equivalent of long-press / right-click.
                if (e.key === 'Enter' && (e.altKey || e.shiftKey)) {
                  e.preventDefault();
                  toggle(item.num);
                }
              }}
              className={`relative min-h-0 min-w-0 rounded border px-0 py-0 text-center text-[8px] font-semibold leading-none select-none [-webkit-touch-callout:none] ${
                !item.playable
                  ? 'border-white/10 bg-black/20 text-white/30'
                  : on
                  ? 'border-white/80 bg-white/20 text-white ring-1 ring-white/50'
                  : en
                    ? 'border-white/15 bg-black/30 text-white/55'
                    : 'border-white/10 bg-black/20 text-white/35'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {/* Keep right-rail test id for older layout assertions / smoke. */}
      <div data-testid="idle-rail-right" className="hidden" aria-hidden />
    </div>
  );
}
