import { describe, expect, it, vi, beforeEach } from 'vitest';

function swapLs(): () => void {
  const g = globalThis as { localStorage?: Storage; window?: Window & typeof globalThis };
  const prev = g.localStorage;
  const prevWin = g.window;
  const map = new Map<string, string>();
  const ls = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
    key: () => null,
    length: 0,
  } as Storage;
  g.localStorage = ls;
  g.window = {
    localStorage: ls,
    dispatchEvent: () => true,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  } as unknown as Window & typeof globalThis;
  return () => {
    g.localStorage = prev;
    if (prevWin === undefined) delete (g as { window?: unknown }).window;
    else g.window = prevWin;
  };
}

describe('master-mute', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('defaults to unmuted and persists on/off', async () => {
    const restore = swapLs();
    const m = await import('../lib/master-mute');
    expect(m.isMasterMuted()).toBe(false);
    m.setMasterMuted(true);
    expect(m.isMasterMuted()).toBe(true);
    expect(localStorage.getItem('amoji.mute.v1')).toBe('on');
    m.setMasterMuted(false);
    expect(m.isMasterMuted()).toBe(false);
    expect(localStorage.getItem('amoji.mute.v1')).toBe('off');
    restore();
  });

  it('toggle flips and returns the new state', async () => {
    const restore = swapLs();
    const m = await import('../lib/master-mute');
    expect(m.toggleMasterMute()).toBe(true);
    expect(m.isMasterMuted()).toBe(true);
    expect(m.toggleMasterMute()).toBe(false);
    restore();
  });

  it('unmute exposes restore and clears mute flag', async () => {
    const restore = swapLs();
    const m = await import('../lib/master-mute');
    m.setMasterMuted(true);
    expect(m.isMasterMuted()).toBe(true);
    m.setMasterMuted(false);
    expect(m.isMasterMuted()).toBe(false);
    expect(typeof m.restoreOutputsAfterUnmute).toBe('function');
    await m.restoreOutputsAfterUnmute();
    restore();
  });

  it('unmute restore path force-unlocks voice + sfx (t719 contract)', async () => {
    const restore = swapLs();
    const src = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('../lib/master-mute.ts', import.meta.url), 'utf8'),
    );
    expect(src).toContain('resumeVoiceEngines');
    expect(src).toContain('resumeSfxContext');
    expect(src).toContain('applyPlaybackVolume');
    const voice = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('../lib/voice.ts', import.meta.url), 'utf8'),
    );
    expect(voice).toMatch(/function unlockAudio\(force/);
    expect(voice).toContain('unlockAudio(true)');
    const m = await import('../lib/master-mute');
    m.setMasterMuted(true);
    m.setMasterMuted(false);
    await m.restoreOutputsAfterUnmute();
    expect(m.isMasterMuted()).toBe(false);
    restore();
  });

  it('unmute sync kick runs before async restore (t719 residual)', async () => {
    const restore = swapLs();
    const src = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('../lib/master-mute.ts', import.meta.url), 'utf8'),
    );
    expect(src).toContain('kickOutputsSyncAfterUnmute');
    expect(src).toContain('restoreMediaElementsAfterUnmute');
    // Sync kick must be invoked from setMasterMuted(false) before void restore.
    const setIdx = src.indexOf('export function setMasterMuted');
    const unmuteArm = src.slice(setIdx, setIdx + 900);
    expect(unmuteArm).toContain('kickOutputsSyncAfterUnmute()');
    expect(unmuteArm.indexOf('kickOutputsSyncAfterUnmute()')).toBeLessThan(
      unmuteArm.indexOf('void restoreOutputsAfterUnmute()'),
    );
    // Emit precedes silence/restore so voice/sfx listeners stay in the click stack.
    expect(unmuteArm.indexOf('emit(muted)')).toBeLessThan(unmuteArm.indexOf('if (muted)'));
    const voice = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('../lib/voice.ts', import.meta.url), 'utf8'),
    );
    expect(voice).toContain('subscribeMasterMute((muted)');
    expect(voice).toContain('resumeVoiceEngines()');
    expect(voice).toContain('sfxVoiceRelease()');
    const sfx = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('../lib/sfx.ts', import.meta.url), 'utf8'),
    );
    expect(sfx).toContain('subscribeMasterMute((muted)');
    expect(sfx).toContain('resumeSfxContext()');
    const m = await import('../lib/master-mute');
    m.setMasterMuted(true);
    m.setMasterMuted(false);
    expect(m.isMasterMuted()).toBe(false);
    expect(typeof m.kickOutputsSyncAfterUnmute).toBe('function');
    m.kickOutputsSyncAfterUnmute();
    restore();
  });

});
