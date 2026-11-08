'use client';
/**
 * Scroll-to-unlock for mandatory warning / legal copy.
 * If the pane does not overflow, the reader has already seen everything —
 * unlock immediately. Otherwise require reaching the bottom.
 */
import { useEffect, useState, type RefObject } from 'react';

const BOTTOM_EPS_PX = 16;

export function hasReachedScrollEnd(el: HTMLElement, eps = BOTTOM_EPS_PX): boolean {
  if (el.scrollHeight <= el.clientHeight + eps) return true;
  return el.scrollTop + el.clientHeight >= el.scrollHeight - eps;
}

export function useScrollReachedEnd(
  ref: RefObject<HTMLElement | null>,
  active = true,
): boolean {
  const [reached, setReached] = useState(false);

  useEffect(() => {
    if (!active) {
      setReached(false);
      return;
    }
    const el = ref.current;
    if (!el) return;

    const check = () => setReached(hasReachedScrollEnd(el));
    check();
    el.addEventListener('scroll', check, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(check) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', check);
      ro?.disconnect();
    };
  }, [ref, active]);

  return reached;
}
