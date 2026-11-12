import { describe, expect, it } from 'vitest';
import { triggerMove, holdMove, clearMove, activeMove } from '../lib/companion';
import { duckLibraryBed } from '../lib/music';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('sticky sing/dance performance clears on new talk', () => {
  it('clearMove ends an active held sing performance immediately', () => {
    const now = 1_000_000;
    triggerMove('sing', now);
    holdMove(180_000);
    expect(activeMove(now + 5_000)?.kind).toBe('sing');
    clearMove();
    expect(activeMove(now + 5_000)).toBeUndefined();
  });

  it('ChatPanel clears move + performance music when a new send starts', () => {
    const panel = fs.readFileSync(path.join(ROOT, 'components/ChatPanel.tsx'), 'utf8');
    expect(panel).toContain('clearMove()');
    expect(panel).toContain('clearPerfMotionProfile()');
    expect(panel).toContain('endPerformanceMusic()');
  });

  it('ChatPanel clears sticky move when the library bed stops', () => {
    const panel = fs.readFileSync(path.join(ROOT, 'components/ChatPanel.tsx'), 'utf8');
    const onClip = panel.slice(panel.indexOf("detail?.state === 'stopped'"), panel.indexOf('amoji:library-clip'));
    expect(onClip).toContain('clearMove()');
    expect(onClip).toContain('clearPerfMotionProfile()');
    expect(onClip).toContain('setNowPlaying(null)');
    expect(onClip).toContain('pendingShowDanceRef.current = null');
  });

  it('duckLibraryBed is a no-op so voice/BGM stay steady', () => {
    expect(() => duckLibraryBed(0.1, 100)).not.toThrow();
    const music = fs.readFileSync(path.join(ROOT, 'lib/music.ts'), 'utf8');
    expect(music).toMatch(/duckLibraryBed[\s\S]*no auto duck/);
  });
});
