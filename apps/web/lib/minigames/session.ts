// Frame snapshot the existing CompanionCanvas reads. Same shape as the
// companion move/laugh clocks: the chat overlay writes, the canvas samples.

import type { EmotionHints, MiniEmotionKind, MiniGameView } from './types';

let view: MiniGameView | null = null;

type PickFn = (nx: number, ny: number) => { x: number; z: number } | null;
let pick: PickFn | null = null;

export function setMiniGameView(next: MiniGameView | null): void {
  view = next;
}

export function getMiniGameView(): MiniGameView | null {
  return view;
}

export function isMiniGameActive(): boolean {
  return view != null;
}

/** Canvas registers a ground-plane unproject so hold-to-run aims in the arena. */
export function registerGroundPick(fn: PickFn | null): void {
  pick = fn;
}

export function pickGround(nx: number, ny: number): { x: number; z: number } | null {
  return pick ? pick(nx, ny) : null;
}

export interface MiniGameEmotionDetail {
  kind: MiniEmotionKind;
  hints: EmotionHints;
  line?: string;
}

/** Custom event the chat pipeline can listen for. Hints are applied by the caller too. */
export function publishMiniGameEmotion(detail: MiniGameEmotionDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('amoji:minigame-emotion', { detail }));
}

const CHROME_EVENT = 'amoji:minigame-chrome';
const OPEN_EVENT = 'amoji:minigame-open';

/** Chat room hides the status plate, settings, wardrobe, and the game menu. */
export function setMiniGameChromeHidden(hidden: boolean): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CHROME_EVENT, { detail: hidden }));
}

export function subscribeMiniGameChrome(fn: (hidden: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const on = (e: Event) => fn(Boolean((e as CustomEvent<boolean>).detail));
  window.addEventListener(CHROME_EVENT, on);
  return () => window.removeEventListener(CHROME_EVENT, on);
}

/** Top-right card menu asks the chat panel to open a title screen. */
export function requestOpenMiniGame(kind: 'tag' | 'lane'): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: kind }));
}

export function subscribeMiniGameOpen(fn: (kind: 'tag' | 'lane') => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const on = (e: Event) => {
    const kind = (e as CustomEvent<string>).detail;
    if (kind === 'tag' || kind === 'lane') fn(kind);
  };
  window.addEventListener(OPEN_EVENT, on);
  return () => window.removeEventListener(OPEN_EVENT, on);
}
