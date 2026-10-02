'use client';
// Horizontal scroll strip with arrow buttons (arrows on wide screens where
// touch-drag is unavailable). Used by the one-page selector.
import { useEffect, useRef, useState, type ReactNode } from 'react';

export default function HScrollRow({ children, ariaLabel }: { children: ReactNode; ariaLabel?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nudge = (dir: number) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  const arrow =
    'absolute top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full ' +
    'border border-white/10 bg-black/60 text-lg text-white/80 backdrop-blur-md transition hover:bg-black/85 md:flex';

  return (
    <div className="relative">
      <div
        ref={ref}
        aria-label={ariaLabel}
        className="flex gap-3 overflow-x-auto scroll-smooth px-1 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      {canLeft && (
        <button onClick={() => nudge(-1)} aria-label="scroll left" className={`${arrow} left-0`}>‹</button>
      )}
      {canRight && (
        <button onClick={() => nudge(1)} aria-label="scroll right" className={`${arrow} right-0`}>›</button>
      )}
    </div>
  );
}
