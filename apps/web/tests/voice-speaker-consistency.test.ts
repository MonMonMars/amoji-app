import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { PITCH_BIAS_MALE, PITCH_BIAS_FEMALE } from '../lib/gtts';

const web = join(__dirname, '..');
const gtts = readFileSync(join(web, 'lib/gtts.ts'), 'utf8');
const voice = readFileSync(join(web, 'lib/voice.ts'), 'utf8');

describe('voice does not switch speaker mid-line or between characters', () => {
  it('a mid-line failure resumes the remainder instead of replaying the line', () => {
    // Symptom Mon reported: "some voice will jump to using other speaker".
    // Cause: when the HTTP tier died partway, the next tier was handed the
    // FULL original text, so the sentence restarted in a different voice.
    expect(voice).toContain('speakRemainderInChain');
    expect(voice).toContain('onProgress: (n) => { spokenChars = n; }');
    expect(voice).toMatch(/speechRemainder\(text, text\.slice\(0, spokenChars\)\)/);
  });

  it('the remainder path speaks only the tail, never the whole line', () => {
    const start = voice.indexOf('const speakRemainderInChain');
    const end = voice.indexOf('const runAt =', start);
    const block = voice.slice(start, end);
    expect(block).toContain('speakGtts(rest');
    expect(block).not.toContain('speakGtts(text');
    expect(block).toContain('runSynthTail(rest');
  });

  it('the browser tail fallback takes the remainder, not the full text', () => {
    const start = voice.indexOf('const runSynthTail');
    const end = voice.indexOf('const runFreeChain', start);
    const block = voice.slice(start, end);
    expect(block).toContain('synthSpeak(rest');
    expect(block).not.toContain('synthSpeak(text');
  });

  it('gtts reports progress so a fallback knows how far it got', () => {
    expect(gtts).toContain('onProgress?: (spokenChars: number) => void');
    expect(gtts).toMatch(/spokenChars \+= piece\.text\.length/);
    expect(gtts).toContain('opts.onProgress?.(spokenChars)');
  });

  it('character identity is carried by pitch, since the endpoint has one voice per language', () => {
    // The Translate endpoint takes only `tl`, so every character shares a voice
    // and male companions sounded female. Pitch bias is the only lever.
    expect(gtts).toContain('pitchBias?: number');
    expect(gtts).toContain('preservesPitch = false');
    expect(PITCH_BIAS_MALE).toBeLessThan(1); // male reads deeper
    expect(PITCH_BIAS_FEMALE).toBeGreaterThanOrEqual(1); // female slightly brighter
  });

  it('every gtts call site takes its pitch from ONE shared helper', () => {
    // t790 — the loading filler had to sound like the same person as the
    // reply. Copy-pasting the ternary per call site is how a new caller
    // silently forgets it, so voice.ts owns a single resolver and every tier
    // (reply, resumed tail, greeting, sing, preview, filler) calls it.
    expect(voice).toContain('export function gttsPitchBias(gender:');
    expect(voice).toMatch(/pitchBias: gttsPitchBias\(/);
    const ternaries = voice.match(/pitchBias: [a-zA-Z]+ === 'male' \?/g) ?? [];
    expect(ternaries).toEqual([]);
    // Gender base + per-character jitter live in gtts-timbre; voice.ts only
    // re-exports so every call site stays on one name.
    expect(voice).toContain('gttsCharacterPitchBias');
    const helperBody = voice.slice(
      voice.indexOf('export function gttsPitchBias'),
      voice.indexOf('}', voice.indexOf('export function gttsPitchBias')) + 1,
    );
    expect(helperBody).toContain('gttsCharacterPitchBias');
  });

  it('passes characterId into the pitch helper on live speak paths', () => {
    // Same-gender cast members must not collapse to one sound.
    expect(voice).toMatch(/gttsPitchBias\(spokenGender,\s*characterId\)/);
    expect(voice).toMatch(/gttsPitchBias\(gender,\s*characterId\)/);
  });

  it('the pitch shift stays bounded so the line is not garbled', () => {
    // preservesPitch=false changes tempo too; a big bias sounds sped up, not
    // like a different person.
    expect(gtts).toMatch(/Math\.min\(1\.25, Math\.max\(0\.8,/);
    expect(gtts).toMatch(/clamp\(opts\.pitchBias \?\? 1, 0\.82, 1\.2\)/);
  });

  it('a canceled tier still settles immediately rather than falling through', () => {
    // A user cut must not trigger the resume path.
    expect(voice).toMatch(/message === 'canceled'\)\s*\{\s*settle\(\);\s*return;\s*\}/);
  });
});
