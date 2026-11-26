/**
 * Owner report: "the change character page not displaying".
 *
 * Reproduced: chat → 更改 opens /change, but when the entry gate has not been
 * answered yet the gate is rendered IN PLACE of the board. Its one-tap START
 * sent the user to /gate/audio?next=%2F, and the audio step then finished on
 * `/` (the title screen) — so /change itself was never displayed.
 *
 * The gate already documents "In-place EntryGate → return to the protected
 * route", but RequireEntryGate never passed `onDone`, so that branch was dead
 * code and every in-place gate fell back to the funnel's `/`.
 *
 * These assertions fail before the fix and pass after it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { audioGateNextPath } from '../components/QuickSetup';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => fs.readFileSync(path.resolve(here, rel), 'utf8');

describe('in-place entry gate returns to the route it guarded', () => {
  it('continues to /change (and /select, /chat) instead of the title screen', () => {
    expect(audioGateNextPath('/change', true)).toBe('/change');
    expect(audioGateNextPath('/select', true)).toBe('/select');
    expect(audioGateNextPath('/chat', true)).toBe('/chat');
  });

  it('keeps the documented standalone funnel: /setup and /gate continue to /', () => {
    expect(audioGateNextPath('/setup', false)).toBe('/');
    expect(audioGateNextPath('/gate', false)).toBe('/');
  });

  it('falls back to /select when next has no pathname', () => {
    expect(audioGateNextPath(null, true)).toBe('/select');
    expect(audioGateNextPath('', true)).toBe('/select');
  });

  it('never emits the GitHub Pages basePath twice', () => {
    // usePathname() is basePath-stripped; window.location.pathname is not.
    for (const p of ['/change', '/select', '/chat']) {
      expect(audioGateNextPath(p, true).startsWith('/amoji-app/')).toBe(false);
    }
    const quick = read('../components/QuickSetup.tsx');
    expect(quick).toContain('usePathname');
    expect(quick).not.toContain('window.location.pathname');
  });

  it('RequireEntryGate passes onDone, so the in-place branch is reachable at all', () => {
    const guard = read('../components/RequireEntryGate.tsx');
    expect(guard).toMatch(/<EntryGate[^>]*\sonDone=/);
  });
});
