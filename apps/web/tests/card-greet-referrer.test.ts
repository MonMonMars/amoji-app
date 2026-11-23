/**
 * Bug A regression: character / voice cards were silent on tap even though the
 * click handlers were wired and called playVoiceGreeting synchronously.
 *
 * Root cause (verified live in Chrome): lib/gtts.ts fetches
 * https://translate.google.com/translate_tts with `new Audio(url)`. A media
 * request carries this page's Referer, and Google answers **404** to any
 * translate_tts hit that includes a Referer. The element then fires
 * NotSupportedError and the card is silent. app/layout.tsx must therefore keep
 * the document policy `same-origin` so cross-origin media sends no Referer
 * (document.referrer for in-app back navigation still works).
 *
 * These tests also pin the gesture contract: the greet must start inside the
 * tap handler (iOS Safari drops autoplay if the first play() happens after an
 * await / in a later task), with the tapped card's own locale + voice id.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(join(here, rel), 'utf8');

function callBlock(src: string, needle: string, len = 1200): string {
  const at = src.indexOf(needle);
  expect(at, needle).toBeGreaterThan(-1);
  return src.slice(at, at + len);
}

describe('card greet survives the Google TTS Referer block', () => {
  it('root layout sets the document referrer policy to same-origin', () => {
    const layout = read('../app/layout.tsx');
    expect(layout).toMatch(/export const metadata: Metadata = \{/);
    expect(layout).toMatch(/referrer:\s*["']same-origin["']/);
  });

  it('gTTS audio is cross-origin and relies on that document policy', () => {
    const gtts = read('../lib/gtts.ts');
    const audio = gtts.slice(gtts.indexOf('new Audio('));
    expect(audio).toContain('https://translate.google.com/translate_tts');
    // No per-element policy: media elements ignore referrerPolicy unreliably
    // on Safari, so the document-level policy is the actual guard.
    expect(audio.slice(0, 400)).not.toContain('referrerPolicy');
  });
});

describe('card tap starts the greet inside the gesture', () => {
  it('character card onSelect calls playVoiceGreeting synchronously', () => {
    const board = read('../components/SelectionBoard.tsx');
    const handler = callBlock(board, 'onSelect={(id) =>');
    const greet = handler.indexOf('playVoiceGreeting(');
    expect(greet).toBeGreaterThan(-1);
    // Nothing async may sit in front of the call, or iOS loses the gesture.
    const before = handler.slice(0, greet);
    expect(before).not.toMatch(/\bawait\b/);
    expect(before).not.toMatch(/\bsetTimeout\b/);
    expect(before).not.toMatch(/queueMicrotask|requestAnimationFrame/);
    expect(before).not.toMatch(/\.then\s*\(/);
    // Card's own character + the page language (page lang is per-card locale).
    expect(handler).toContain('playVoiceGreeting(');
    expect(handler).toMatch(/activeVoiceChoice\(lang,\s*chosen\.gender\)/);
  });

  it('voice card onTap speaks the tapped card locale and voice id', () => {
    const row = read('../components/TtsVoiceRow.tsx');
    const handler = callBlock(row, 'const onTap = (button: TtsButtonVoice) =>');
    expect(handler).toContain('playVoiceGreeting(characterId, button.locale, button.id)');
    expect(handler).not.toMatch(/\bawait\b/);
    expect(handler).not.toMatch(/\bsetTimeout\b/);
  });

  it('greets go through the per-language rotating bank, never one fixed phrase', () => {
    const board = read('../components/SelectionBoard.tsx');
    const row = read('../components/TtsVoiceRow.tsx');
    // No 4th `line` argument on either card path.
    expect(board).toMatch(/playVoiceGreeting\(\s*chosen\.id,\s*lang,\s*activeVoiceChoice\(lang,\s*chosen\.gender\)\.id,?\s*\)/);
    expect(row).toMatch(/playVoiceGreeting\(characterId, button\.locale, button\.id\)/);
    expect(row).toMatch(/playVoiceGreeting\(characterId, lang, added\.id\)/);
  });
});
