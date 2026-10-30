'use client';
// Overlapping card fan for the selection board. The chosen card sits in the
// middle, in front, a little larger and brighter. Neighbors overlap it,
// scale down, and tilt — an arcade ring, not a left-packed strip.
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';

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
export function portraitCardBox(stageHeight: number): { width: number; height: number; step: number } {
  const stage = stageHeight > 0 ? stageHeight : 360;
  const height = Math.round(Math.min(stage * 0.95, 640));
  const width = Math.round(height * 0.88);
  const step = Math.max(72, Math.round(width * 0.48));
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
  return Math.max(scaleOverflow, Math.round(slack * 0.16));
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
  const root = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);
  const suppress = useRef(false);
  const indexRef = useRef(0);
  const [compact, setCompact] = useState(false);
  const [fine, setFine] = useState(false);
  const [stageH, setStageH] = useState(0);

  const index = Math.max(0, items.findIndex((item) => item.id === selectedId));
  const portrait = size === 'compact' ? compactCardBox() : portraitCardBox(stageH);
  const step = size === 'scene' ? (compact ? 58 : 86) : portrait.step;
  const centerScale = size === 'compact' ? 1.04 : size === 'portrait' ? PORTRAIT_CENTER_SCALE : 1.1;
  const reach = compact ? 2 : 4;

  useLayoutEffect(() => {
    if (size !== 'portrait') return;
    const el = root.current;
    if (!el) return;
    const measure = () => {
      const h = el.getBoundingClientRect().height;
      if (h > 0) setStageH(h);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [size]);

  useEffect(() => {
    const narrow = window.matchMedia('(max-width: 640px)');
    const pointer = window.matchMedia('(pointer: fine), (hover: hover)');
    const apply = () => {
      setCompact(narrow.matches);
      setFine(pointer.matches);
    };
    apply();
    narrow.addEventListener('change', apply);
    pointer.addEventListener('change', apply);
    return () => {
      narrow.removeEventListener('change', apply);
      pointer.removeEventListener('change', apply);
    };
  }, []);

  const go = (next: number) => {
    const item = items[next];
    if (!item) return;
    indexRef.current = next;
    onSelect(item.id);
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
    ? 'absolute inset-0 z-20'
    : size === 'compact'
      ? 'relative z-10 h-[2.6rem] w-full'
      : 'relative z-10 h-[4.4rem] w-full sm:h-[4.8rem]';

  const arrow = (enabled: boolean) =>
    'fx-press-lite absolute top-1/2 z-[90] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/40 bg-black/75 text-white shadow-[0_4px_16px_rgba(0,0,0,0.6)] backdrop-blur-md ' +
    (enabled ? 'cursor-pointer hover:border-white hover:bg-black/90' : 'cursor-default opacity-30');

  return (
    <div
      ref={root}
      aria-label={ariaLabel}
      className={`mx-auto touch-none ${stageClass}`}
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
      {fine && (
        <>
          <button type="button" aria-label="scroll left" disabled={index <= 0} onClick={() => go(index - 1)} className={`${arrow(index > 0)} left-0`}>
            <Chevron dir="left" />
          </button>
          <button type="button" aria-label="scroll right" disabled={index >= items.length - 1} onClick={() => go(index + 1)} className={`${arrow(index < items.length - 1)} right-0`}>
            <Chevron dir="right" />
          </button>
        </>
      )}
    </div>
  );
}
