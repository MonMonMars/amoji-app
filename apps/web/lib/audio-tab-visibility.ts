'use client';
/**
 * Tab blur/focus volume stability — suspend WebAudio, duck companion media,
 * and avoid stacking resume()/replay on visibility return.
 */
import {
  resumeSharedAudioOutput,
  suspendSharedAudioOutput,
} from './audio-output';
import { applyPlaybackVolume } from './playback-volume';
import { isMasterMuted } from './master-mute';

export const VISIBILITY_RESUME_DEBOUNCE_MS = 280;

let bound = false;
let resumeTimer: ReturnType<typeof setTimeout> | null = null;
let tabHidden = false;
/** Block gesture-replay / auto unlock bursts immediately after a tab return. */
let suppressCompanionUntil = 0;

export function isTabAudioObscured(): boolean {
  return tabHidden;
}

/** True while auto-replay and unlock bursts should stay quiet after tab return. */
export function shouldSuppressVisibilityAudioBurst(): boolean {
  return tabHidden || Date.now() < suppressCompanionUntil;
}

export type TabVisibilityHooks = {
  onHide?: () => void;
  onShow?: () => void;
  pauseSynth?: () => void;
  pauseTtsMedia?: () => void;
};

let hooks: TabVisibilityHooks = {};

export function registerTabVisibilityHooks(next: TabVisibilityHooks): void {
  hooks = { ...hooks, ...next };
}

function pauseCompanionMediaElements(): void {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('audio, video').forEach((el) => {
    if (!(el instanceof HTMLMediaElement)) return;
    if (el.dataset.amojiAudio !== '1' && !el.closest('[data-amoji-audio-root]')) return;
    try {
      if (!el.paused) el.pause();
      el.muted = true;
    } catch { /* ignore */ }
  });
}

function restoreCompanionMediaLevels(): void {
  if (typeof document === 'undefined' || isMasterMuted()) return;
  document.querySelectorAll('audio, video').forEach((el) => {
    if (!(el instanceof HTMLMediaElement)) return;
    if (el.dataset.amojiAudio !== '1' && !el.closest('[data-amoji-audio-root]')) return;
    try {
      el.muted = false;
      applyPlaybackVolume(el);
    } catch { /* ignore */ }
  });
}

function onDocumentHidden(): void {
  tabHidden = true;
  if (resumeTimer) {
    clearTimeout(resumeTimer);
    resumeTimer = null;
  }
  try { hooks.pauseTtsMedia?.(); } catch { /* ignore */ }
  try { hooks.pauseSynth?.(); } catch { /* ignore */ }
  pauseCompanionMediaElements();
  suspendSharedAudioOutput();
  try { hooks.onHide?.(); } catch { /* ignore */ }
}

function onDocumentVisible(): void {
  tabHidden = false;
  suppressCompanionUntil = Date.now() + VISIBILITY_RESUME_DEBOUNCE_MS + 120;
  if (resumeTimer) clearTimeout(resumeTimer);
  resumeTimer = setTimeout(() => {
    resumeTimer = null;
    if (typeof document !== 'undefined' && document.hidden) return;
    if (isMasterMuted()) return;
    resumeSharedAudioOutput();
    restoreCompanionMediaLevels();
    try { hooks.onShow?.(); } catch { /* ignore */ }
  }, VISIBILITY_RESUME_DEBOUNCE_MS);
}

/** Register Page Visibility handler (idempotent). */
export function initAudioTabVisibility(): void {
  if (typeof document === 'undefined' || bound) return;
  bound = true;
  const onVis = () => {
    if (document.hidden) onDocumentHidden();
    else onDocumentVisible();
  };
  document.addEventListener('visibilitychange', onVis);
  if (document.hidden) onDocumentHidden();
}

/** Vitest: reset module latch without a real document. */
export function resetAudioTabVisibilityForTests(): void {
  bound = false;
  tabHidden = false;
  suppressCompanionUntil = 0;
  if (resumeTimer) {
    clearTimeout(resumeTimer);
    resumeTimer = null;
  }
  hooks = {};
}
