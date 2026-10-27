'use client';
// One short click for every button press in the app. Capture-phase so it
// runs even when a control stops the event later. A press that lands while
// the tick is still playing is ignored inside playUiClick.

import { useEffect } from 'react';
import { playUiClick } from '../lib/sfx';

function pressable(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const hit = target.closest('button, [role="button"]');
  if (!hit) return false;
  if (hit instanceof HTMLButtonElement && hit.disabled) return false;
  if (hit.getAttribute('aria-disabled') === 'true') return false;
  return true;
}

export default function UiClickSound() {
  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if (!pressable(event.target)) return;
      playUiClick();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (!pressable(event.target)) return;
      playUiClick();
    };
    window.addEventListener('pointerdown', onPointer, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('pointerdown', onPointer, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, []);
  return null;
}
