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

/**
 * Bighead card box for the portrait fan. The select stage used to be a live
 * full-body model; that space now belongs to these stills. Height tracks the
 * measured fan (capped so a tall monitor does not grow a poster past the
 * controls). Width stays the old portrait ratio. Step stays inside the card
 * so neighbors overlap and the center face stays tappable.
 */
export function portraitCardBox(stageHeight: number): { width: number; height: number; step: number } {
  const stage = stageHeight > 0 ? stageHeight : 320;
  const height = Math.round(Math.min(stage * 0.86, 520));
  const width = Math.round(height * 0.7);
  const step = Math.max(56, Math.round(width * 0.58));
  return { width, height, step };
}

/** Keep the 1.1 center scale inside the fan, just under the name. */
export function portraitTop(stageHeight: number, cardHeight: number): number {
  const stage = stageHeight > 0 ? stageHeight : 320;
  const slack = Math.max(0, stage - cardHeight);
  const scaleOverflow = Math.ceil(cardHeight * 0.05);
  return Math.max(scaleOverflow, Math.round(slack * 0.22));
}

/** Pose of a card `offset` steps from the focused index. Negative is left. */
export function arcPose(offset: number, step: number): ArcPose {
  const distance = Math.abs(offset);
  const scale = offset === 0 ? 1.1 : Math.max(0.62, 1 - distance * 0.09);
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
  ariaLabel,
  size,
  label,
  children,
}: {
  items: T[];
  selectedId: string;
  onSelect: (id: string) => void;
  ariaLabel: string;
  size: 'portrait' | 'scene';
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
  const portrait = portraitCardBox(stageH);
  const step = size === 'portrait' ? portrait.step : (compact ? 58 : 86);
  const reach = compact ? 3 : 5;

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

  const cardClass = size === 'portrait'
    ? ''
    : 'top-1 h-[6.1rem] w-[8.2rem] sm:h-[7.2rem] sm:w-[10.4rem]';
  const stageClass = size === 'portrait'
    ? 'absolute inset-0 z-20'
    : 'relative z-10 h-[8.6rem] w-full sm:h-[10.4rem]';

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
        const pose = arcPose(offset, step);
        const active = item.id === selectedId;
        return (
          <div
            key={item.id}
            className={`arc-card absolute left-1/2 ${cardClass}`}
            style={{
              width: size === 'portrait' ? portrait.width : undefined,
              height: size === 'portrait' ? portrait.height : undefined,
              top: size === 'portrait' ? portraitTop(stageH, portrait.height) : undefined,
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
                onSelect(item.id);
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
