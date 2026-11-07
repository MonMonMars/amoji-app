'use client';
// Overlapping card fan for the selection board. The chosen card sits in the
// middle, in front, a little larger and brighter. Neighbors overlap it,
// scale down, and tilt — an arcade ring, not a left-packed strip.
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { t, loadPrefs } from '../lib/prefs';

export type ArcPose = {
  x: number;
  y: number;
  rot: number;
  scale: number;
  z: number;
  opacity: number;
  /** Far cards stay mounted for the slide but do not take taps. */
  inert: boolean;
};

/** Center pop for portrait cards. Kept under 1.1 so the larger box still fits. */
export const PORTRAIT_CENTER_SCALE = 1.05;

/**
 * Bighead card box for the portrait fan. The select stage used to be a live
 * full-body model; that space now belongs to these stills. Height fills most
 * of the measured fan (capped so a tall monitor does not cover the controls).
 * Width is wider than the old 0.7 portrait ratio so names and faces read
 * larger. Step stays inside the card so neighbors overlap.
 */
export function portraitCardBox(stageHeight: number, stageWidth = 0): { width: number; height: number; step: number } {
  const stage = stageHeight > 0 ? stageHeight : 360;
  // iPhone portrait→landscape: keep a readable floor so cards do not vanish (Mon t530),
  // and a max so PORTRAIT_CENTER_SCALE + portraitTop do not top-trim the focused card.
  const isLandscape = stageWidth > 0 && stageWidth > stage * 1.15;
  const landscapeFloor = isLandscape
    ? Math.min(200, Math.max(120, Math.round(stage * 0.55)))
    : 0;
  const landscapeMax = isLandscape
    ? Math.max(landscapeFloor, Math.round(stage * 0.78))
    : 640;
  let height = Math.round(Math.min(Math.max(stage * 0.95, landscapeFloor), landscapeMax, 640));
  let width = Math.round(height * 0.88);
  // Phones: tall stage made cards wider than the viewport (iPhone ~390).
  // Cap width so the focused card + scale fit; shrink height to keep ratio.
  if (stageWidth > 0) {
    const maxWidth = Math.max(120, Math.round(stageWidth * 0.72));
    if (width > maxWidth) {
      width = maxWidth;
      height = Math.round(width / 0.88);
    }
  }
  if (isLandscape && height > landscapeMax) {
    height = landscapeMax;
    width = Math.min(Math.round(height * 0.88), Math.max(120, Math.round(stageWidth * 0.72)));
    height = Math.round(width / 0.88);
  }
  if (landscapeFloor > 0 && height < landscapeFloor && stageWidth > 0) {
    height = Math.min(landscapeFloor, Math.max(96, Math.round(stage * 0.72)));
    width = Math.min(Math.round(height * 0.88), Math.max(120, Math.round(stageWidth * 0.72)));
    height = Math.round(width / 0.88);
  }
  const step = Math.max(48, Math.round(width * 0.48));
  return { width, height, step };
}

/**
 * Language portraits. Shortest of the three select rows: under the scene
 * card (6.1rem / ~98px, 7.2rem from sm) and at most half a character card
 * (portraitCardBox(320) is ~298px). Same 0.8 portrait ratio as the bigheads.
 */
export function compactCardBox(): { width: number; height: number; step: number } {
  const height = 36;
  const width = 128;
  const step = 72;
  return { width, height, step };
}

/** Keep the center scale inside the fan, just under the name. */
export function portraitTop(stageHeight: number, cardHeight: number): number {
  const stage = stageHeight > 0 ? stageHeight : 360;
  const slack = Math.max(0, stage - cardHeight);
  const scaleOverflow = Math.ceil(cardHeight * ((PORTRAIT_CENTER_SCALE - 1) / 2));
  const desired = Math.max(scaleOverflow, Math.round(slack * 0.22));
  const overflow = (PORTRAIT_CENTER_SCALE - 1) / 2;
  const maxTop = Math.max(scaleOverflow, Math.floor(stage - cardHeight * (1 + overflow)));
  return Math.min(desired, maxTop);
}

/** Pose of a card `offset` steps from the focused index. Negative is left. */
export function arcPose(offset: number, step: number, centerScale = 1.1): ArcPose {
  const distance = Math.abs(offset);
  const scale = offset === 0 ? centerScale : Math.max(0.58, 1 - distance * 0.11);
  return {
    x: offset * step,
    y: distance * 5 + distance * distance * 0.45,
    rot: offset * 7,
    scale,
    z: 80 - distance,
    opacity: distance > 6 ? 0 : 1,
    inert: distance > 5,
  };
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 h-6 w-6" aria-hidden="true">
      {dir === 'left' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
    </svg>
  );
}

export default function ArcFan<T extends { id: string }>({
  items,
  selectedId,
  onSelect,
  onConfirm,
  ariaLabel,
  size,
  label,
  children,
}: {
  items: T[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Tap a card. Drag, wheel, and arrows keep using onSelect to move focus. */
  onConfirm?: (id: string) => void;
  ariaLabel: string;
  /** portrait: large character heads. compact: small language cards. scene: backgrounds. */
  size: 'portrait' | 'compact' | 'scene';
  label: (item: T) => string;
  children: (item: T, active: boolean) => ReactNode;
}) {
  const lang = loadPrefs().lang;
  const root = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);
  const suppress = useRef(false);
  const indexRef = useRef(0);
  const [compact, setCompact] = useState(false);
  // Match HScrollRow: portrait always; compact/scene decide mouse/trackpad on first
  // client paint so chevrons do not false→true flash after the effect (Mon t530).
  const [showArrows, setShowArrows] = useState(() => {
    if (size === 'portrait') return true;
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(pointer: fine)').matches || window.matchMedia('(hover: hover)').matches;
  });
  const [stageH, setStageH] = useState(0);
  const [stageW, setStageW] = useState(0);

  const index = Math.max(0, items.findIndex((item) => item.id === selectedId));
  const portrait = size === 'compact' ? compactCardBox() : portraitCardBox(stageH, stageW);
  const step = size === 'scene' ? (compact ? 58 : 86) : portrait.step;
  const centerScale = size === 'compact' ? 1.04 : size === 'portrait' ? PORTRAIT_CENTER_SCALE : 1.1;
  const reach = compact ? 2 : 4;

  useLayoutEffect(() => {
    if (size !== 'portrait') return;
    const el = root.current;
    if (!el) return;
    const measure = () => {
      const box = el.getBoundingClientRect();
      if (box.height > 0) setStageH(box.height);
      if (box.width > 0) setStageW(box.width);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const onOrient = () => { window.setTimeout(measure, 80); window.setTimeout(measure, 320); };
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', onOrient);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', onOrient);
    };
  }, [size]);

  useEffect(() => {
    const narrow = window.matchMedia('(max-width: 640px)');
    // Separate queries (HScrollRow). Portrait always keeps arrows for Windows mouse (Mon t530).
    const fine = window.matchMedia('(pointer: fine)');
    const hover = window.matchMedia('(hover: hover)');
    const apply = () => {
      setCompact(narrow.matches);
      setShowArrows(size === 'portrait' || fine.matches || hover.matches);
    };
    apply();
    narrow.addEventListener('change', apply);
    fine.addEventListener('change', apply);
    hover.addEventListener('change', apply);
    return () => {
      narrow.removeEventListener('change', apply);
      fine.removeEventListener('change', apply);
      hover.removeEventListener('change', apply);
    };
  }, [size]);

  const go = (next: number, opts?: { focus?: boolean }) => {
    const item = items[next];
    if (!item) return;
    indexRef.current = next;
    onSelect(item.id);
    if (opts?.focus) {
      // Keep keyboard focus on the newly selected card (screen readers + further arrows).
      requestAnimationFrame(() => {
        const sel = `[data-row-item="${CSS.escape(item.id)}"]`;
        const btn = root.current?.querySelector(sel) as HTMLElement | null;
        btn?.focus();
      });
    }
  };

  const onKeyNav = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(indexRef.current - 1, { focus: true });
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(indexRef.current + 1, { focus: true });
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      go(0, { focus: true });
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      go(items.length - 1, { focus: true });
    }
  };

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (Math.abs(delta) < 8) return;
      event.preventDefault();
      const next = indexRef.current + (delta > 0 ? 1 : -1);
      const item = items[next];
      if (!item) return;
      indexRef.current = next;
      onSelect(item.id);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [items, onSelect]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = { x: event.clientX, moved: false };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.x;
    if (Math.abs(dx) < 42) return;
    drag.current = { x: event.clientX, moved: true };
    suppress.current = true;
    go(index + (dx < 0 ? 1 : -1));
  };
  const onPointerUp = () => {
    if (drag.current?.moved) {
      window.setTimeout(() => { suppress.current = false; }, 40);
    }
    drag.current = null;
  };

  const cardClass = size === 'scene'
    ? 'top-1 h-[3.4rem] w-[5.2rem] sm:h-[3.8rem] sm:w-[6rem]'
    : '';
  const stageClass = size === 'portrait'
    ? 'absolute inset-0 z-20 max-w-full overflow-x-hidden overflow-y-visible'
    : size === 'compact'
      ? 'relative z-10 h-[2.6rem] w-full'
      : 'relative z-10 h-[4.4rem] w-full sm:h-[4.8rem]';

  const arrow = (enabled: boolean) =>
    'fx-press-lite pointer-events-auto absolute top-1/2 z-[90] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/40 bg-black/75 text-white shadow-[0_4px_16px_rgba(0,0,0,0.6)] backdrop-blur-md ' +
    (enabled ? 'cursor-pointer hover:border-white hover:bg-black/90' : 'cursor-default opacity-30');

  return (
    <div
      ref={root}
      role="group"
      aria-label={ariaLabel}
      tabIndex={0}
      className={`mx-auto touch-none ${stageClass}`}
      onKeyDown={onKeyNav}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="pointer-events-none absolute bottom-1 left-1/2 h-3 w-40 -translate-x-1/2 rounded-full bg-black/50 blur-md sm:w-56" />
      {items.map((item, i) => {
        const offset = i - index;
        if (Math.abs(offset) > reach + 1) return null;
        const pose = arcPose(offset, step, centerScale);
        const active = item.id === selectedId;
        return (
          <div
            key={item.id}
            className={`arc-card absolute left-1/2 ${cardClass}`}
            style={{
              width: size === 'scene' ? undefined : portrait.width,
              height: size === 'scene' ? undefined : portrait.height,
              top: size === 'portrait' ? portraitTop(stageH, portrait.height) : size === 'compact' ? 2 : undefined,
              transform: `translateX(calc(-50% + ${pose.x}px)) translateY(${pose.y}px) rotate(${pose.rot}deg) scale(${pose.scale})`,
              zIndex: pose.z,
              opacity: pose.opacity,
              filter: active ? 'brightness(1.08) saturate(1.05)' : 'brightness(0.78) saturate(0.9)',
              pointerEvents: pose.inert ? 'none' : 'auto',
            }}
          >
            <button
              type="button"
              data-row-item={item.id}
              aria-label={label(item)}
              aria-pressed={active}
              onKeyDown={onKeyNav}
              onClick={() => {
                if (suppress.current) return;
                if (onConfirm) onConfirm(item.id);
                else onSelect(item.id);
              }}
              className={`fx-press ui-card relative h-full w-full overflow-hidden rounded-2xl border text-left ${
                active ? 'border-white/90' : 'border-white/15'
              }`}
              style={active ? {
                boxShadow: '0 18px 40px -18px rgba(0,0,0,0.85), 0 0 0 2px rgba(255,255,255,0.9), inset 0 1px 0 rgba(255,255,255,0.35)',
              } : {
                boxShadow: '0 10px 24px -16px rgba(0,0,0,0.8)',
              }}
            >
              {children(item, active)}
            </button>
          </div>
        );
      })}
      {showArrows && (
        <>
          <button type="button" aria-label={t(lang, 'scrollLeft')} title={t(lang, 'scrollLeft')} disabled={index <= 0} onClick={() => go(index - 1)} className={`${arrow(index > 0)} left-1`}>
            <Chevron dir="left" />
          </button>
          <button type="button" aria-label={t(lang, 'scrollRight')} title={t(lang, 'scrollRight')} disabled={index >= items.length - 1} onClick={() => go(index + 1)} className={`${arrow(index < items.length - 1)} right-1`}>
            <Chevron dir="right" />
          </button>
        </>
      )}
    </div>
  );
}
