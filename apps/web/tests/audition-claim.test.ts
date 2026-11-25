/**
 * Single-flight speaker for select-board auditions (owner 2026-11-25):
 * "double voice, two voice over lapping" while a voice button was previewed.
 *
 * `previewVoiceChoice` / `playVoiceGreeting` start the Google-MP3 tier and the
 * Edge neural tier together so the tap is audible fast. The old code let
 * whichever `onPlaying` fired first "win" by returning early from the other
 * callback — but an <audio> that has fired `onplay` is ALREADY AUDIBLE, so the
 * loser kept playing over the winner. Two modules, two elements, two voices.
 *
 * These tests pin the fix: a claim stops the other tiers, a late tier is
 * stopped itself, and a superseded audition cannot start anything at all.
 * The source-level checks keep voice.ts wired to this module.
 */
import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAuditionClaim, type AuditionTier } from '../lib/audition-claim';

const here = path.dirname(fileURLToPath(import.meta.url));

function harness(current: { value: boolean } = { value: true }) {
  const stops: Record<AuditionTier, ReturnType<typeof vi.fn>> = {
    edge: vi.fn(),
    gtts: vi.fn(),
    synth: vi.fn(),
  };
  const silenced: Array<[AuditionTier, string]> = [];
  const claim = createAuditionClaim({
    stop: stops,
    isCurrent: () => current.value,
    onSilenced: (tier, reason) => { silenced.push([tier, reason]); },
  });
  return { claim, stops, silenced, current };
}

describe('claiming the speaker tears the parallel tier down', () => {
  it('the first tier to start sound stops every other tier', () => {
    const { claim, stops } = harness();
    expect(claim.owner()).toBeNull();
    expect(claim.claim('gtts')).toBe(true);
    expect(claim.owner()).toBe('gtts');
    // This is the double-voice fix: the Edge element that was fetched in
    // parallel is torn down the moment the MP3 tier is audible.
    expect(stops.edge).toHaveBeenCalledTimes(1);
    expect(stops.synth).toHaveBeenCalledTimes(1);
    // Never stop the tier that just started — that would silence the line.
    expect(stops.gtts).not.toHaveBeenCalled();
  });

  it('a later tier is stopped itself instead of talking over the winner', () => {
    const { claim, stops, silenced } = harness();
    expect(claim.claim('gtts')).toBe(true);
    expect(claim.claim('edge')).toBe(false);
    // Stopped once when gTTS took the speaker, and again as the loser.
    expect(stops.edge).toHaveBeenCalledTimes(2);
    expect(claim.owner()).toBe('gtts');
    expect(silenced).toEqual([['edge', 'lost']]);
  });

  it('re-claiming by the owner is a no-op, not a self-stop', () => {
    const { claim, stops } = harness();
    expect(claim.claim('edge')).toBe(true);
    expect(claim.claim('edge')).toBe(true);
    expect(stops.edge).not.toHaveBeenCalled();
    // The other tiers were stopped exactly once (at the first claim).
    expect(stops.gtts).toHaveBeenCalledTimes(1);
    expect(stops.synth).toHaveBeenCalledTimes(1);
  });

  it('the device voice can take over from a dead winner and stops the old tiers', () => {
    const { claim, stops } = harness();
    claim.claim('edge');
    // voice.ts releases the tier when it fails/claim-then-dies.
    claim.release('edge');
    expect(claim.claim('synth')).toBe(true);
    // Edge is stopped by the synth claim; gTTS by both claims.
    expect(stops.edge).toHaveBeenCalledTimes(1);
    expect(stops.gtts).toHaveBeenCalledTimes(2);
    expect(claim.owner()).toBe('synth');
  });
});

describe('a second concurrent preview retires the first', () => {
  it('a superseded audition cannot start, and its own element is stopped', () => {
    const { claim, stops, silenced, current } = harness();
    // Preview A starts the MP3 tier.
    expect(claim.claim('gtts')).toBe(true);
    // Preview B taps another voice: the generation moves on.
    current.value = false;
    // A's Edge fetch completes afterwards — it must not play.
    expect(claim.claim('edge')).toBe(false);
    expect(stops.edge).toHaveBeenCalledTimes(2);
    expect(silenced.at(-1)).toEqual(['edge', 'stale']);
    // The old owner is not replaced by the retired flight.
    expect(claim.owner()).toBe('gtts');
  });

  it('release only clears the tier that owns the speaker', () => {
    const { claim } = harness();
    claim.claim('gtts');
    claim.release('edge');
    expect(claim.owner()).toBe('gtts');
    claim.release('gtts');
    expect(claim.owner()).toBeNull();
  });

  it('a throwing stop cannot block the claim', () => {
    const claim = createAuditionClaim({
      stop: {
        edge: () => { throw new Error('no element'); },
        gtts: () => undefined,
        synth: () => { throw new Error('no synth'); },
      },
    });
    expect(claim.claim('gtts')).toBe(true);
    expect(claim.owner()).toBe('gtts');
  });
});

describe('voice.ts wires both audition paths through the claim', () => {
  const voice = fs.readFileSync(path.resolve(here, '../lib/voice.ts'), 'utf8');

  function fnBody(name: string, nextName: string): string {
    const start = voice.indexOf(`export function ${name}`);
    const end = voice.indexOf(nextName, start);
    return voice.slice(start, end === -1 ? undefined : end);
  }

  it('greeting and preview create a claim and check it before starting sound', () => {
    for (const body of [
      fnBody('playVoiceGreeting', 'previewLibraryClip'),
      fnBody('previewVoiceChoice', 'const TEST_LINES'),
    ]) {
      expect(body).toContain('createAuditionClaim(');
      // Every tier asks the claim first, then reports the start.
      expect(body).toMatch(/if \(!claim\.claim\('gtts'\)\) return;/);
      expect(body).toMatch(/if \(!claim\.claim\('edge'\)\) return;/);
      // The claim covers all three tiers, so the device voice cannot sneak in
      // while another tier is still speaking.
      expect(body).toMatch(/synth: \(\) => haltBrowserSynth\(\)/);
    }
  });

  it('nothing in the audition paths uses a bare "return early" on the loser', () => {
    const greet = fnBody('playVoiceGreeting', 'previewLibraryClip');
    const preview = fnBody('previewVoiceChoice', 'const TEST_LINES');
    for (const body of [greet, preview]) {
      // The retired pattern that left the loser audible.
      expect(body).not.toMatch(/if \(spokenBy === 'gtts'\) return;/);
      expect(body).not.toMatch(/if \(spokenBy && spokenBy !== 'gtts'\) return;/);
    }
  });

  it('a preview cancels a running greeting across BOTH paths, not just within one', () => {
    const greet = fnBody('playVoiceGreeting', 'previewLibraryClip');
    const preview = fnBody('previewVoiceChoice', 'const TEST_LINES');
    for (const body of [greet, preview]) {
      // Newest playback retires the previous one before it can speak: shared
      // gate (greeting vs preview vs previous preview) + teardown of the other
      // tiers' elements (edge / synth; gTTS has its own gesture generation).
      expect(body).toContain('cardGreetGate.begin(');
      expect(body).toContain('stopSpeakingForCardAudition()');
      expect(body).toContain('const stale = () => auditionGen !== cardAuditionGeneration;');
    }
  });
});
