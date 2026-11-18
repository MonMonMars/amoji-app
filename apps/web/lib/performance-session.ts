/**
 * Single gate for listen / sing / dance performance flow (r214).
 * Replaces scattered ChatPanel refs + documents phase for SING_DANCE_PIPELINE.
 */

import type { PerformanceClip } from './performance-clips';
import {
  armPerfDance,
  refreshPendingPerfDance,
  shouldStartDanceOnAudioPlaying,
  type PendingPerfDance,
  type PerfBodyMove,
} from './dance-audio-gate';

export type PerformancePhase = 'idle' | 'intro' | 'listen' | 'sing' | 'dance' | 'ending';

export interface PerformanceSessionSnapshot {
  phase: PerformancePhase;
  listenOnly: boolean;
  clip: PerformanceClip | null;
  pendingBody: PendingPerfDance | null;
}

let phase: PerformancePhase = 'idle';
let listenOnly = false;
let clip: PerformanceClip | null = null;
let pendingBody: PendingPerfDance | null = null;

function snapshot(): PerformanceSessionSnapshot {
  return { phase, listenOnly, clip, pendingBody };
}

/** @internal tests */
export function getPerformanceSession(): PerformanceSessionSnapshot {
  return snapshot();
}

export function performanceSessionPhase(): PerformancePhase {
  return phase;
}

export function isListenOnlyPerformance(): boolean {
  return listenOnly && (phase === 'listen' || phase === 'intro');
}

/** True while swapping beds — do not clearMove on library `stopped`. */
export function shouldDeferClearOnBedStop(): boolean {
  return pendingBody !== null;
}

export function activePerformanceClip(): PerformanceClip | null {
  return clip;
}

/** Arm intro + bed; body stays calm until library `playing` (unless listen-only). */
export function beginPerformanceSession(
  kind: 'song' | 'dance',
  resolvedClip: PerformanceClip,
  holdMs: number,
  listenOnlyBed = false,
): void {
  phase = listenOnlyBed ? 'listen' : kind === 'song' ? 'sing' : 'dance';
  listenOnly = listenOnlyBed;
  clip = resolvedClip;
  pendingBody = listenOnlyBed
    ? null
  : armPerfDance(kind === 'song' ? 'sing' : 'dance', holdMs, resolvedClip.id);
}

/** After `startLibraryPerformance` resolves the audible bed. */
export function syncPerformanceBed(playing: PerformanceClip, holdMs: number): void {
  clip = playing;
  if (listenOnly || !pendingBody) return;
  const refreshed = refreshPendingPerfDance(pendingBody, playing.id, holdMs);
  if (refreshed) pendingBody = refreshed;
}

export function clearPerformanceBodyArm(): void {
  pendingBody = null;
}

/** Consume pending body when library bed reports playing; null if not ready. */
export function takePendingBodyForPlaying(playingId: string): PendingPerfDance | null {
  if (!shouldStartDanceOnAudioPlaying(pendingBody, playingId)) return null;
  const arm = pendingBody;
  pendingBody = null;
  phase = arm.bodyMove === 'sing' ? 'sing' : 'dance';
  return arm;
}

/** Resolve clip for motion profile — session clip wins when ids match. */
export function performanceClipForPlaying(playingId: string): PerformanceClip | null {
  if (clip?.id === playingId) return clip;
  return clip;
}

export function markPerformanceIntro(): void {
  if (phase !== 'idle') phase = listenOnly ? 'listen' : phase;
}

export function endPerformanceSession(): void {
  phase = 'ending';
  pendingBody = null;
  clip = null;
  listenOnly = false;
  phase = 'idle';
}