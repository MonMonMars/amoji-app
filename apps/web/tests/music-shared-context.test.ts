import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOTDIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('library performance keeps shared AudioContext alive', () => {
  it('music.ts primes shared context and never closes it on halt', () => {
    const music = fs.readFileSync(path.join(ROOTDIR, 'lib/music.ts'), 'utf8');
    expect(music).toContain('primeSharedAudioContext');
    expect(music).toContain('isSharedDefaultAudioContext');
    expect(music).toContain('Never close the shared default AudioContext');
    // haltBand / haltPiano must not call .close() on the shared ctx.
    const haltBand = music.slice(music.indexOf('function haltBand'), music.indexOf('export function startMusic'));
    expect(haltBand).not.toMatch(/\.close\(/);
    const haltPiano = music.slice(music.indexOf('function haltPiano'), music.indexOf('export function startPiano'));
    expect(haltPiano).not.toMatch(/\.close\(/);
  });

  it('audio-output exposes prime + shared identity helpers', () => {
    const out = fs.readFileSync(path.join(ROOTDIR, 'lib/audio-output.ts'), 'utf8');
    expect(out).toContain('export function isSharedDefaultAudioContext');
    expect(out).toContain('export function primeSharedAudioContext');
  });
});
