'use client';
// Who owns the audition speaker — exactly one tier at a time.
//
// Owner report 2026-11-25: "double voice, two voice over lapping" while a voice
// button was previewed. The preview starts the Google-MP3 tier and the Edge
// neural tier at the same moment and lets whichever answers first keep the
// line. That is a fine race for LATENCY and a broken one for TEARDOWN: an
// HTMLAudioElement that has fired `onplay` is ALREADY AUDIBLE, so returning
// early from the losing tier's callback leaves the loser playing over the
// winner. The two tiers live in different modules with their own element
// (lib/gtts.ts `currentAudio`, lib/edge-tts.ts `currentAudio`), so neither
// stop function silences the other on its own.
//
// This module makes the claim explicit: the first tier that actually STARTS
// sound takes the speaker, and taking it synchronously stops every other tier.
// A tier that arrives later is stopped itself. It also refuses a claim from a
// superseded audition, so a slow fetch from a retired preview/greeting cannot
// start talking after a newer one has replaced it.

export type AuditionTier = 'edge' | 'gtts' | 'synth';

const TIERS: readonly AuditionTier[] = ['edge', 'gtts', 'synth'];

export type SilencedReason = 'lost' | 'stale';

export interface AuditionClaimOptions {
  /** Stop that tier's audio even when it is already sounding. */
  stop: Record<AuditionTier, () => void>;
  /**
   * False once a newer audition replaced this one. Checked on every claim.
   * Omitted = always current (a one-shot preview that nothing can replace).
   */
  isCurrent?: () => boolean;
  /** Observability hook; tests use it to prove the loser is silenced. */
  onSilenced?: (tier: AuditionTier, reason: SilencedReason) => void;
}

export interface AuditionClaim {
  /**
   * Take the speaker for `tier`. Returns true only when this tier owns sound
   * now. False means the caller must NOT play: either another tier already
   * owns the line, or a newer audition retired this one. In both cases the
   * caller's own element is stopped first, so a tier that already started
   * cannot keep talking.
   */
  claim(tier: AuditionTier): boolean;
  /** Tier that currently owns the speaker, or null before anything started. */
  owner(): AuditionTier | null;
  /** Release the speaker if (and only if) `tier` still owns it. */
  release(tier: AuditionTier): void;
}

export function createAuditionClaim(opts: AuditionClaimOptions): AuditionClaim {
  let owner: AuditionTier | null = null;

  const stopTier = (tier: AuditionTier) => {
    try {
      opts.stop[tier]();
    } catch {
      /* a broken tier must not block the claim */
    }
  };

  return {
    claim(tier) {
      if (opts.isCurrent && !opts.isCurrent()) {
        stopTier(tier);
        try { opts.onSilenced?.(tier, 'stale'); } catch { /* ignore */ }
        return false;
      }
      if (owner && owner !== tier) {
        stopTier(tier);
        try { opts.onSilenced?.(tier, 'lost'); } catch { /* ignore */ }
        return false;
      }
      if (owner === tier) return true;
      owner = tier;
      // The winner silences the tiers that could still be in flight. This is
      // the "explicit teardown of any existing audio element" half of the fix:
      // without it the parallel tier keeps playing and the owner hears two.
      for (const other of TIERS) {
        if (other !== tier) stopTier(other);
      }
      return true;
    },
    owner() {
      return owner;
    },
    release(tier) {
      if (owner === tier) owner = null;
    },
  };
}
