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
 * r2026-10-05.105 (Master Simon request): scroll position memory. Each row
 * remembers its offset in sessionStorage (keyed by `rowKey`), so the
 * select ⇄ change round-trip reopens the rows exactly where the user left
 * them. On a fresh entry (no memory) the row opens CENTERED on the currently
 * selected tile; picking a new tile re-centers smoothly and invalidates the
 * memory, so the next entry centers on the NEW pick.
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

export default function HScrollRow({
  children,
  ariaLabel,
  rowKey,
  selectedId,
}: {
  children: ReactNode;
  ariaLabel?: string;
  /** sessionStorage namespace for this row's remembered scroll offset */
  rowKey?: string;
  /** data-row-item id of the currently selected tile — centered on entry */
  selectedId?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const didMount = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [showArrows, setShowArrows] = useState(false);
  const storageKey = rowKey ? `amoji.row.${rowKey}` : null;

  // scroll so the selected tile sits centered in the row viewport; rect-based
  // (scrollBy delta) so it is immune to offsetParent coordinate quirks.
  // returns false when there is nothing to center on.
  const centerSelected = (behavior: ScrollBehavior): boolean => {
    const el = ref.current;
    if (!el || !selectedId) return false;
    const item = el.querySelector<HTMLElement>(`[data-row-item="${selectedId}"]`);
    if (!item) return false;
    const elRect = el.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const delta = itemRect.left + itemRect.width / 2 - (elRect.left + elRect.width / 2);
    if (Math.abs(delta) < 4) return true;
    el.scrollBy({ left: delta, behavior });
    return true;
  };

  // debounced sessionStorage write — every scroll (drag, arrows, recenter)
  // becomes the position the row reopens at on the next page entry.
  const remember = () => {
    const el = ref.current;
    if (!el || !storageKey) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try { sessionStorage.setItem(storageKey!, String(el.scrollLeft)); } catch { /* ignore */ }
    }, 150);
  };

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
    remember();
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

    // r105 entry position: reopen where the user left off (select ⇄ change
    // round-trips keep the browsing position); on a truly fresh entry (no
    // memory) open centered on the currently selected tile so the current
    // pick is visible on first paint instead of the row's start.
    let remembered: number | null = null;
    if (storageKey) {
      try {
        const raw = sessionStorage.getItem(storageKey);
        if (raw !== null) remembered = Number(raw) || 0;
      } catch { /* ignore */ }
    }
    if (remembered !== null) el.scrollTo({ left: remembered, behavior: 'auto' });
    else centerSelected('auto');
    didMount.current = true;

    update();

    return () => {
      fine.removeEventListener('change', decide);
      hover.removeEventListener('change', decide);
      ro.disconnect();
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      mo.disconnect();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // r105: a fresh pick re-centers its row (smooth) and wipes the remembered
    // offset — the scroll events from the recenter then store the centered
    // position, so the NEXT entry opens centered on the NEW pick.
    if (!didMount.current) return;
    if (storageKey) {
      try { sessionStorage.removeItem(storageKey); } catch { /* ignore */ }
    }
    centerSelected('smooth');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

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
