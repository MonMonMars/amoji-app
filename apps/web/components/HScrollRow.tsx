'use client';
/*
 * Horizontal scroll strip with arrow icon buttons. On non-touch (mouse /
 * fine-pointer) devices — where finger-drag is unavailable — a chevron button
 * sits at each edge of every row: click to scroll a "page", smooth-animated.
 *
 * r2026-10-04.57 (Master Simon request): the arrows are now BIGGER, always
 * opaque-on-desktop, and shown on any hover-capable device (some Windows
 * touch-laptops report pointer:coarse, which used to hide them entirely).
 * They still stay hidden on pure-touch phones, where finger-drag is natural.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      {dir === 'left' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
    </svg>
  );
}

export default function HScrollRow({ children, ariaLabel }: { children: ReactNode; ariaLabel?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [showArrows, setShowArrows] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  useEffect(() => {
    // Desktop / PC: show arrows on any device that has a precise pointing
    // device OR hover capability (covers mouse desktops AND touch-laptops
    // with a trackpad, which some browsers report as coarse).
    const fine = window.matchMedia('(pointer: fine)');
    const hover = window.matchMedia('(hover: hover)');
    const decide = () => setShowArrows(fine.matches || hover.matches);
    decide();
    fine.addEventListener('change', decide);
    hover.addEventListener('change', decide);

    const el = ref.current;
    if (!el) {
      return () => {
        fine.removeEventListener('change', decide);
        hover.removeEventListener('change', decide);
      };
    }

    // track both the strip and its content (kid-mode filtering resizes rows)
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener('scroll', update);
    window.addEventListener('resize', update);

    // scrollability also changes when children mount/unmount (kid mode,
    // cast updates) without any resize — watch the child list too.
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true });

    update();

    return () => {
      fine.removeEventListener('change', decide);
      hover.removeEventListener('change', decide);
      ro.disconnect();
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      mo.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nudge = (dir: number) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  // Prominent game-UI style disc: solid, glows on hover, clearly dimmed only
  // when that direction is exhausted.
  const arrow = (enabled: boolean) =>
    'absolute top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full ' +
    'border-2 border-white/40 bg-black/75 text-white shadow-[0_4px_16px_rgba(0,0,0,0.6)] backdrop-blur-md transition-all ' +
    (enabled
      ? 'cursor-pointer hover:scale-115 hover:border-white hover:bg-black/90 active:scale-95 '
      : 'cursor-default opacity-30');

  return (
    <div className="relative">
      <div
        ref={ref}
        aria-label={ariaLabel}
        className="flex gap-3 overflow-x-auto scroll-smooth px-1 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      {showArrows && (
        <>
          <button
            onClick={() => nudge(-1)}
            aria-label="scroll left"
            title="Scroll left"
            disabled={!canLeft}
            className={`${arrow(canLeft)} -left-1`}
          >
            <Chevron dir="left" />
          </button>
          <button
            onClick={() => nudge(1)}
            aria-label="scroll right"
            title="Scroll right"
            disabled={!canRight}
            className={`${arrow(canRight)} -right-1`}
          >
            <Chevron dir="right" />
          </button>
        </>
      )}
    </div>
  );
}
