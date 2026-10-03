'use client';
/*
 * Horizontal scroll strip with arrow icon buttons. On non-touch (mouse /
 * fine-pointer) devices — where finger-drag is unavailable — a chevron button
 * sits at each edge of every row: click to scroll a "page", smooth-animated.
 * Arrows render always (dimmed when the row can't scroll that way) so desktop
 * users can see the affordance; on touch devices they stay hidden (drag works).
 * Used by the one-page selector, so /select and /change both get this.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
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
  const [finePointer, setFinePointer] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  useEffect(() => {
    // non-touch devices only: mouse / trackpad pointers
    const mq = window.matchMedia('(pointer: fine)');
    setFinePointer(mq.matches);
    const onMq = (e: MediaQueryListEvent) => setFinePointer(e.matches);
    mq.addEventListener('change', onMq);

    const el = ref.current;
    if (!el) return () => mq.removeEventListener('change', onMq);

    // track both the strip and its content (kid-mode filtering resizes rows)
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    update();

    return () => {
      mq.removeEventListener('change', onMq);
      ro.disconnect();
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nudge = (dir: number) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  const arrow = (enabled: boolean) =>
    'absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full ' +
    'border border-white/15 bg-black/60 text-white backdrop-blur-md transition ' +
    (enabled ? 'cursor-pointer hover:scale-110 hover:bg-black/85 active:scale-95 ' : 'cursor-default opacity-25');

  return (
    <div className="relative">
      <div
        ref={ref}
        aria-label={ariaLabel}
        className="flex gap-3 overflow-x-auto scroll-smooth px-1 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      {finePointer && (
        <>
          <button
            onClick={() => nudge(-1)}
            aria-label="scroll left"
            disabled={!canLeft}
            className={`${arrow(canLeft)} left-0`}
          >
            <Chevron dir="left" />
          </button>
          <button
            onClick={() => nudge(1)}
            aria-label="scroll right"
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
