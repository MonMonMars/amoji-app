/**
 * Owner 2026-11-26: "please don't talk while singing or music time" and then
 * "stop the music or song if need to talk."
 *
 * Two rules, both enforced here:
 *   1. she never speaks OVER an audible bed — the gate sits in `speak()`, the
 *      single choke point for every audible line;
 *   2. when a line must be heard (a poke reaction, a real user turn), the show
 *      YIELDS — the bed is stopped first, so the words are never layered on
 *      her song. Only non-essential lines (fillers, idle chatter, replay taps)
 *      are dropped instead of interrupting the music.
 *
 * The intro that announces a show is spoken BEFORE the bed starts; a real user
 * turn ends the bed via stopSpeakingForInterrupt → endPerformanceMusic.
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

  it('a line that must be heard makes room instead of being dropped', () => {
    const body = VOICE.slice(
      VOICE.indexOf('export function speak('),
      VOICE.indexOf('function performSpeak('),
    );
    const gate = body.indexOf('if (isLibraryClipAudible())');
    expect(gate).toBeGreaterThan(-1);
    const branch = body.slice(gate, gate + 500);
    // Non-essential line → silent; a line that must be heard → end the bed, then
    // speak. Two intents qualify: `resumable` (a real conversation turn) and
    // `mustBeHeard` (a direct user action — a poke reaction, which stays a hard
    // cut and is therefore never resumable). Regression: a poke went silent
    // whenever this gate kept the old `!opts?.resumable`-only test.
    expect(branch).toMatch(/if \(!opts\?\.resumable && !opts\?\.mustBeHeard\) \{[\s\S]{0,240}return;/);
    expect(branch).toContain('endPerformanceMusic()');
    expect(body.indexOf('endPerformanceMusic()')).toBeLessThan(body.indexOf('lineQueue.enqueue'));
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

describe('a poke during a show stops the show, then talks', () => {
  it('ends the bed before the impact clip and the spoken reaction', () => {
    const start = VOICE.indexOf('if (isLibraryClipAudible()) endPerformanceMusic();');
    expect(start).toBeGreaterThan(-1);
    const body = VOICE.slice(start, start + 1600);
    // The bed stops before the poke foley is queued and before the line is said.
    expect(body.indexOf('endPerformanceMusic()')).toBeLessThan(body.indexOf("text: 'poke-sfx'"));
    expect(body.indexOf("text: 'poke-sfx'")).toBeLessThan(body.indexOf('pokeBurstSpokenLine'));
    // It is still spoken — the show yields, she is not muted — and it is spoken
    // as a must-heard line, the one intent the bed gate above may not drop.
    expect(body).toContain('speak(line, characterId, lang');
    expect(body).toMatch(/speak\(line, characterId, lang[^;]*mustBeHeard: true/);
    expect(body).not.toContain('if (performing) return;');
  });

  it('captures the interrupted conversation before stopping the show', () => {
    const capture = VOICE.indexOf('const resumable = capturePokeResume()');
    const stop = VOICE.indexOf('if (isLibraryClipAudible()) endPerformanceMusic();');
    const arm = VOICE.indexOf('if (resumable) pokeResume.arm(resumable);');
    expect(stop).toBeLessThan(capture);
    expect(capture).toBeLessThan(arm);
  });
});
