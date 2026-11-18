import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const music = fs.readFileSync(path.join(ROOT, 'lib/music.ts'), 'utf8');

describe('music instant play/stop (no bed fades)', () => {
  it('procedural band + piano start without lead-in delay', () => {
    const startMusic = music.slice(music.indexOf('export function startMusic'), music.indexOf('export function stopMusic'));
    expect(startMusic).toContain('nextTime = ac.currentTime;');
    expect(startMusic).not.toContain('nextTime = ac.currentTime + 0.08');
    const startPiano = music.slice(music.indexOf('export function startPiano'), music.indexOf('export function stopPiano'));
    expect(startPiano).toContain('let t = ac.currentTime;');
    expect(startPiano).not.toContain('ac.currentTime + 0.08');
  });

  it('keeps duckLibraryBed as no-op (TTS does not auto-duck beds)', () => {
    expect(music).toMatch(/export function duckLibraryBed[\s\S]*\/\* no auto duck/);
  });
});
