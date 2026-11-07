'use client';
// Shared focus trap for aria-modal surfaces.
//
// Every modal in the app already moved focus IN on open and restored it on
// close, and swallowed Escape — but none of them trapped Tab. So a keyboard
// user could tab straight out of a dialog that assistive tech had just been
// told (via aria-modal="true") was the only reachable content.
//
// For LegalGate that is worse than a cosmetic bug: it is a mandatory
// click-to-accept gate, so tabbing past it reached the page behind and let the
// user skip the gate entirely.
//
// Usage:
//   const ref = useFocusTrap<HTMLDivElement>(isOpen);
//   <div ref={ref} role="dialog" aria-modal="true" tabIndex={-1}> … </div>
//
// The hook does not move initial focus — callers already do that deliberately
// (SettingsSheet → its close button, LegalGate → Accept, and so on).

import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusablesIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

/**
 * Keeps Tab / Shift+Tab inside `containerRef` while `active` is true.
 * Returns the ref to attach to the dialog element.
 */
export function useFocusTrap<T extends HTMLElement>(
  active: boolean,
  containerRef?: React.RefObject<T | null>,
): React.RefObject<T | null> {
  const ownRef = useRef<T>(null);
  const ref = containerRef ?? ownRef;

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const root = ref.current;
      if (!root) return;
      const items = focusablesIn(root);
      if (items.length === 0) {
        // Nothing focusable inside: keep focus on the dialog itself rather
        // than letting Tab walk into the page behind it.
        e.preventDefault();
        root.focus?.();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active_ = document.activeElement as HTMLElement | null;

      if (!active_ || !root.contains(active_)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && active_ === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active_ === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [active, ref]);

  return ref;
}
