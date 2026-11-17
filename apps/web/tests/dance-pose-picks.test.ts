import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ownerDanceClipPrefs } from '../lib/owner-dance-picks';
import { resolvePerfMotion } from '../lib/performance-motion';
import { preferredPerfIdleForContent } from '../lib/content-motion';
import {
  forgetIdleEnabledCache,
  resetIdleEnabled,
  setIdleEnabled,
} from '../lib/idle-enabled';
import { forgetIdlePickCache, resetIdlePicks, saveIdlePick } from '../lib/idle-pick';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function mockStorage() {
  const store = new Map<string, string>();
  (globalThis as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: () => null,
    get length() { return store.size; },
  };
  return store;
}

afterEach(() => {
  resetIdlePicks();
  resetIdleEnabled();
  forgetIdleEnabledCache();
  forgetIdlePickCache();
});

describe('dance pose + owner dance picks', () => {
  it('owner enabled dance rail clips lead resolvePerfMotion preferred chain', () => {
    mockStorage();
    setIdleEnabled(27, true); // lib_C113 hip hop
    expect(ownerDanceClipPrefs()).toEqual(['lib_C113']);
    const profile = resolvePerfMotion(
      { id: 'dance-happy-loop', kind: 'dance', style: 'cheerful pop' },
      { ownerDanceClips: ownerDanceClipPrefs() },
    );
    expect(profile.preferredClipIds[0]).toBe('lib_C113');
    expect(profile.fallbackClipIds[0]).toBe('lib_C113');
  });

  it('per-character dance pin wins over style tag mapping', () => {
    mockStorage();
    saveIdlePick('a01-shino', 'lib_C111');
    expect(ownerDanceClipPrefs('a01-shino')[0]).toBe('lib_C111');
    const profile = resolvePerfMotion(
      { id: 'dance-8bit-disco', kind: 'dance', style: 'upbeat dance' },
      { ownerDanceClips: ownerDanceClipPrefs('a01-shino') },
    );
    expect(profile.preferredClipIds[0]).toBe('lib_C111');
  });

  it('preferredPerfIdleForContent uses owner dance rails', () => {
    mockStorage();
    setIdleEnabled(28, true); // lib_C114 party
    const clip = preferredPerfIdleForContent('dance', 'dance for me', 'a01-shino');
    expect(clip).toBe('lib_C114');
  });

  it('CompanionCanvas loops sing/dance without requiring perfMotionProfile', () => {
    const canvas = fs.readFileSync(path.join(ROOT, 'components/CompanionCanvas.tsx'), 'utf8');
    const playPerf = canvas.slice(canvas.indexOf('const playPerf ='), canvas.indexOf('const startClipEngine'));
    expect(playPerf).toContain('LoopRepeat');
    expect(playPerf).toMatch(/name === 'Dance' \|\| name === 'Sing'/);
    expect(playPerf).not.toMatch(/profile && \(name === 'Dance'/);
  });

  it('ChatPanel commitPendingPerfDance passes owner dance clips on dance shows', () => {
    const panel = fs.readFileSync(path.join(ROOT, 'components/ChatPanel.tsx'), 'utf8');
    expect(panel).toContain('ownerDanceClipPrefs');
    expect(panel).toMatch(/ownerDanceClips: ownerDanceClipPrefs\(characterId\)/);
  });
});