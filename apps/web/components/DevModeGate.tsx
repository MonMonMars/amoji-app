'use client';
// Turns on DEV button marks when ?dev=1 / localStorage / NEXT_PUBLIC_AMOJI_DEV.

import { useEffect } from 'react';
import { isDevMode } from '../lib/dev-mode';

export default function DevModeGate() {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      if (isDevMode()) root.setAttribute('data-amoji-dev', '1');
      else root.removeAttribute('data-amoji-dev');
    };
    apply();
    const onNav = () => apply();
    window.addEventListener('popstate', onNav);
    return () => {
      window.removeEventListener('popstate', onNav);
      root.removeAttribute('data-amoji-dev');
    };
  }, []);
  return null;
}
