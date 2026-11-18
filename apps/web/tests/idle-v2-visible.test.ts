import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  IDLE_VISIBLE_MIN_PLAYBACK,
  IDLE_V2_INNERSCENE_STOCK,
  idleClipPinsCanvas,
  isIdleV2Enabled,
  orderIdleV2VisibleClips,
} from '../lib/idle-v2-visible';
import { idlePlaybackTimeScale } from '../lib/idle-amplitude';
import { forgetIdleEnabledCache, resetIdleEnabled } from '../lib/idle-enabled';

const root = path.resolve(import.meta.dirname, '..');

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
  resetIdleEnabled();
  forgetIdleEnabledCache();
  try { localStorage.removeItem('amoji.dev.idleV2Off'); } catch { /* */ }
});

describe('idle v2 visible default', () => {
  it('enforces IDLE_VISIBLE_MIN_PLAYBACK', () => {
    expect(idlePlaybackTimeScale(0.1)).toBeGreaterThanOrEqual(IDLE_VISIBLE_MIN_PLAYBACK);
  });

  it('expands innerscene stock rotation', () => {
    mockStorage();
    const order = orderIdleV2VisibleClips([...IDLE_V2_INNERSCENE_STOCK, 'lib_C113'], 'char-a');
    expect(order.length).toBeGreaterThanOrEqual(1);
    expect(order).not.toContain('lib_C113');
  });

  it('releases passive pin when v2 enabled', () => {
    expect(idleClipPinsCanvas('IdleInnersceneSam', true)).toBe(false);
    localStorage.setItem('amoji.dev.idleV2Off', '1');
    expect(isIdleV2Enabled()).toBe(false);
    expect(idleClipPinsCanvas('IdleInnersceneSam', true)).toBe(true);
  });

  it('wires CompanionCanvas and ChatPanel', () => {
    const canvas = fs.readFileSync(path.join(root, 'components/CompanionCanvas.tsx'), 'utf8');
    const panel = fs.readFileSync(path.join(root, 'components/ChatPanel.tsx'), 'utf8');
    expect(canvas).toContain('orderIdleV2VisibleClips');
    expect(panel).toContain('idleClipPinsCanvas');
  });
});