/**
 * Owner 2026-11-26: "please don't talk while singing or music time."
 *
 * There was no speech gate at all during a performance: a poke reaction, a
 * poke resume, idle chatter or a replay tap could all be spoken over her own
 * song. The gate now sits in `speak()` — the single choke point for every
 * audible line — and keys on the bed actually being audible, so:
 *   · the intro that announces a show is spoken BEFORE the bed starts;
 *   · a real user turn ends the bed first (stopSpeakingForInterrupt →
 *     endPerformanceMusic), so conversation is never swallowed;
 *   · a poke during a show keeps its impact + body reaction but says nothing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const VOICE = read('lib/voice.ts');
const PANEL = read('components/ChatPanel.tsx');

describe('speak() is silent while a performance bed is audible', () => {
  it('gates at the single choke point on isLibraryClipAudible()', () => {
    const body = VOICE.slice(
      VOICE.indexOf('export function speak('),
      VOICE.indexOf('function performSpeak('),
    );
    expect(body).toContain('isLibraryClipAudible()');
    // The gate must return before the line is queued.
    const gate = body.indexOf('isLibraryClipAudible()');
    expect(gate).toBeGreaterThan(-1);
    expect(body.indexOf('lineQueue.enqueue')).toBeGreaterThan(gate);
  });

  it('stops typing over the show for a real user turn', () => {
    // stopSpeakingForInterrupt ends the bed; send() calls it before replying.
    expect(VOICE).toMatch(/export function stopSpeakingForInterrupt\(\)[\s\S]{0,200}endPerformanceMusic\(\)/);
    expect(PANEL).toMatch(/const send = async[\s\S]{0,900}stopSpeakingForInterrupt\(\)/);
  });
});

describe('a show announces itself before its bed starts', () => {
  it('beginShow retires the previous bed before the intro line', () => {
    const body = PANEL.slice(
      PANEL.indexOf('const beginShow = ('),
      PANEL.indexOf('const playMusicPick ='),
    );
    const retire = body.indexOf('endPerformanceMusic()');
    const intro = body.indexOf('sayLocal(intro');
    expect(retire).toBeGreaterThan(-1);
    expect(intro).toBeGreaterThan(retire);
  });

  it('the dance reply is spoken before the bed, not over it', () => {
    const dance = PANEL.slice(PANEL.indexOf("if (mv === 'dance' && !isListenOnlyPerformance())"));
    const head = dance.slice(0, 500);
    // The beginShow call must be complete (no trailing callback that speaks
    // after the bed is already playing).
    expect(head).toContain("detectMusicStyle(userText));");
    expect(head).not.toMatch(/detectMusicStyle\(userText\),\s*\(\)\s*=>/);
  });
});

describe('a poke during a show reacts but does not talk', () => {
  it('skips the spoken line and the resume arm while the bed is audible', () => {
    const body = VOICE.slice(VOICE.indexOf('const performing = isLibraryClipAudible();'));
    const head = body.slice(0, 1600);
    expect(body.length).toBeGreaterThan(0);
    expect(head).toContain('const resumable = performing ? null');
    expect(head).toMatch(/if \(performing\) return;/);
    // Impact clip is still queued before that return.
    expect(head.indexOf("text: 'poke-sfx'")).toBeLessThan(head.indexOf('if (performing) return;'));
  });
});
