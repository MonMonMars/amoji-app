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
