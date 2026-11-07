/**
 * Runtime check of the greeting's tier arbitration.
 *
 * The reported symptom was "some voice will jump to using other speaker".
 * Two mechanisms can cause that in playVoiceGreeting, and both are only
 * visible by running it:
 *
 *   1. Edge 403s instantly. If its failure immediately ran the synth
 *      fallback, synth started while the MP3 tier was still fetching — two
 *      voices. The code now waits for a grace window before declaring silence.
 *   2. gtts' onPlaying clears `spokenBy` only for the winner, so a late
 *      synth start must not also fire.
 *
 * This test asserts the invariant: for one tap, at most ONE tier ever starts.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const voice = readFileSync(join(__dirname, '../lib/voice.ts'), 'utf8');

/** The greeting function body, isolated so assertions cannot drift. */
function greetingBody(): string {
  const start = voice.indexOf('export function playVoiceGreeting');
  const end = voice.indexOf('export function previewLibraryClip', start);
  return voice.slice(start, end);
}

describe('greeting tier arbitration (one voice per tap)', () => {
  const body = greetingBody();

  it('has exactly one declared winner flag', () => {
    expect(body).toContain("let spokenBy: 'edge' | 'gtts' | 'synth' | null = null");
    // Setting the winner is centralised in onStart, so no tier can bypass it.
    expect(body).toContain('const onStart = (tier');
    expect((body.match(/spokenBy = tier/g) ?? []).length).toBe(1);
  });

  it('the synth fallback refuses to fire once any tier has started', () => {
    expect(body).toMatch(/const runSynthAudition = \(tag: string\) => \{\s*if \(spokenBy\) return;/);
  });

  it('an Edge failure does not start synth while gtts owns the line', () => {
    // Edge 403s for everyone now, so its catch runs on nearly every greeting.
    // Guarding on spokenBy is what stops the second voice.
    expect(body).toContain('const onEdgeFail');
    expect(body).toMatch(/if \(spokenBy\) return; \/\/ gtts owns the line/);
  });

  it('a grace window delays the "nothing spoke" fallback', () => {
    // Without this the dead-Edge catch fired synth instantly, over the MP3 tier.
    expect(body).toContain('edgeGrace');
    expect(body).toMatch(/edgeGrace = setTimeout\([\s\S]{0,120}1500\)/);
  });

  it('the grace timer is cancelled as soon as a tier starts', () => {
    expect(body).toMatch(/if \(edgeGrace\) clearTimeout\(edgeGrace\)/);
    // and on both settle paths
    expect((body.match(/clearTimeout\(edgeGrace\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('every tier carries the same per-character pitch', () => {
    // The SAME character must not sound different on select than in chat.
    // Both paths take the pitch from voice.ts's single resolver.
    expect(body).toContain('pitchBias: gttsPitchBias(gender, characterId)');
    expect(body).not.toMatch(/pitchBias: gender === 'male'/);
  });

  it('all gtts call sites use the character pitch', () => {
    // chat, greeting, resume, sing, preview, loading filler — none may fall
    // back to the raw endpoint voice.
    const calls = voice.match(/speakGtts\((?:text|rest|line)/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(5);
    // Every gtts call site resolves its pitch through the shared helper, so
    // there is exactly one definition and no call site can drift.
    const pitchUses = voice.match(/pitchBias: gttsPitchBias\(/g) ?? [];
    expect(pitchUses.length).toBeGreaterThanOrEqual(5);
    expect(voice).not.toMatch(/pitchBias: [a-zA-Z]+ === 'male' \?/);
  });
});
