/**
 * Gate for song/dance body motion vs library beds.
 *
 * Dance/sing must wait until the bed actually reports `playing` — not button
 * press, not spoken intro TTS, and not fetch/decode alone.
 */

export type PerfBodyMove = 'sing' | 'dance';

export interface PendingPerfDance {
  bodyMove: PerfBodyMove;
  holdMs: number;
  /** Clip id expected when `amoji:library-clip` fires playing. */
  clipId: string;
}

/** Arm a show: intro may speak, but body stays calm until audio plays. */
export function armPerfDance(
  bodyMove: PerfBodyMove,
  holdMs: number,
  clipId: string,
): PendingPerfDance {
  return { bodyMove, holdMs: Math.max(0, holdMs), clipId };
}

/**
 * True when a library-clip `playing` event should start the armed body move.
 * Matching clip id is preferred; any non-empty playing id is accepted while
 * armed (procedural band fallback keeps the same clipId).
 */
export function shouldStartDanceOnAudioPlaying(
  pending: PendingPerfDance | null | undefined,
  playingId: string | undefined | null,
): pending is PendingPerfDance {
  if (!pending) return false;
  if (!playingId) return false;
  return pending.clipId === playingId || playingId.length > 0;
}

/** Refresh hold / clip after `startLibraryPerformance` resolves the real bed. */
export function refreshPendingPerfDance(
  pending: PendingPerfDance | null | undefined,
  clipId: string,
  holdMs: number,
): PendingPerfDance | null {
  if (!pending) return null;
  return { ...pending, clipId, holdMs: Math.max(pending.holdMs, holdMs) };
}
