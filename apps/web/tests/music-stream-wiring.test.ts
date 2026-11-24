// PR #574 integration guard: the keyless curated Jamendo catalog must be
// reachable from the real dance/music playback path, not just from its own
// unit tests.
//
// Contract:
//   • a genre the owner-pinned Mixkit pool cannot answer (jazz/lofi/hiphop…)
//     resolves to a curated Jamendo bed instead of silently dropping to a
//     local CC0 clip;
//   • the owner's own Mixkit pins still win (no regression);
//   • announce (`resolveLibraryPerformance`) and play
//     (`startLibraryPerformance`) resolve to the SAME row;
//   • the bed is marked analysable via `musicPlaybackPlan()`, and carries the
//     licence + attribution its CC deed requires;
//   • resolving/starting a curated bed performs NO network call and reads NO
//     env — so a keyless GitHub Pages export stays inert.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveLibraryPerformance, startLibraryPerformance } from '../lib/music';
import { resetOwnerPerfPicks } from '../lib/owner-perf-picks';
import { listMusicPickOptions } from '../lib/music-ask';
import {
  curatedMusicBed,
  curatedMusicTrackById,
  curatedTrackForStyle,
  curatedTracksForStyle,
} from '../lib/music-stream-bed';
import {
  CURATED_JAMENDO_TRACKS,
  curatedJamendoForMood,
} from '../lib/music-stream-providers';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

beforeEach(() => {
  resetOwnerPerfPicks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('curated catalog selection', () => {
  it('picks a calm curated row for a jazz ask (no owner/Mixkit match)', () => {
    const track = curatedTrackForStyle('jazz', 0);
    expect(track).not.toBeNull();
    expect(track!.id).toMatch(/^jamendo:/);
    expect(track!.mood).toBe('calm');
    expect(curatedJamendoForMood('calm').some((t) => t.id === track!.id)).toBe(true);
  });

  it('mood wins over style — a tired ask never picks a dance track', () => {
    const track = curatedTrackForStyle('pop', 0, 'tired');
    expect(track?.mood).toBe('calm');
  });

  it('rotation by n is deterministic and stays inside the bucket', () => {
    const a = curatedTrackForStyle('lofi', 3);
    const b = curatedTrackForStyle('lofi', 3);
    expect(a?.id).toBe(b?.id);
    expect(curatedTrackForStyle('lofi', 1)?.mood).toBe('calm');
  });

  it('an exact chip id resolves back to the same curated row', () => {
    const first = CURATED_JAMENDO_TRACKS[0]!;
    expect(curatedMusicTrackById(first.id)?.id).toBe(first.id);
    expect(curatedMusicTrackById('jamendo:does-not-exist')).toBeNull();
    expect(curatedMusicTrackById(undefined)).toBeNull();
  });

  it('offers curated chips for a genre the pinned pool cannot answer', () => {
    const opts = listMusicPickOptions({ kind: 'music', style: 'jazz', count: 3 });
    expect(opts.length).toBe(3);
    for (const o of opts) {
      expect(o.source).toBe('stream');
      expect(o.streamId).toMatch(/^jamendo:/);
      expect(o.kind).toBe('dance');
      expect(o.title.length).toBeGreaterThan(0);
    }
  });
});

describe('curated bed shape', () => {
  it('carries the licence, attribution, artist and analysable bit', () => {
    const track = curatedTracksForStyle('jazz', 1)[0]!;
    const bed = curatedMusicBed(track);
    expect(bed.id).toBe(`stream:${track.id}`);
    expect(bed.kind).toBe('dance');
    expect(bed.volume).toBe('bgmVol');
    expect(bed.file).toBe(track.streamUrl);
    expect(bed.durationMs).toBe(Math.round(track.durationSec * 1000));
    expect(bed.analysable).toBe(true);
    expect(bed.license).toBe('Jamendo-CC');
    expect(bed.artist).toBe(track.artist);
    expect(bed.attribution).toContain(track.artist!);
    expect(bed.attribution).toContain(track.licence);
    expect(bed.labels.en).toBe(track.title);
  });
});

describe('playback path wiring', () => {
  it('a jazz dance ask resolves to a curated stream bed', () => {
    const clip = resolveLibraryPerformance({
      kind: 'dance',
      style: 'jazz',
      lang: 'en',
      n: 0,
      ms: 12_000,
    });
    expect(clip.id).toMatch(/^stream:jamendo:/);
    expect(clip.file).toContain('prod-1.storage.jamendo.com');
    expect(clip.analysable).toBe(true);
  });

  it('owner-pinned Mixkit beds still win (no regression)', () => {
    const clip = resolveLibraryPerformance({
      kind: 'dance',
      style: 'jpop',
      lang: 'en',
      n: 0,
      ms: 12_000,
    });
    expect(clip.id).toMatch(/^stream:/);
    expect(clip.id).not.toMatch(/jamendo:/);
  });

  it('announce and play resolve the same curated row', () => {
    const q = { kind: 'dance' as const, style: 'lofi', lang: 'en', n: 4 };
    const announced = resolveLibraryPerformance(q);
    const played = startLibraryPerformance({ ...q, ms: 12_000 });
    expect(played.id).toBe(announced.id);
  });

  it('starting a curated bed performs no network call and reads no env', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const envBefore = { ...process.env };
    const clip = startLibraryPerformance({
      kind: 'dance',
      style: 'hiphop',
      lang: 'en',
      n: 0,
      ms: 12_000,
    });
    expect(clip.id).toMatch(/^stream:jamendo:/);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(process.env).toEqual(envBefore);
  });

  it('bare music stays on the owner pick, not a random curated row', () => {
    const clip = resolveLibraryPerformance({ kind: 'dance', lang: 'en', n: 0, ms: 12_000 });
    expect(clip.id).toMatch(/^stream:/);
    expect(clip.id).not.toMatch(/jamendo:/);
  });
});

describe('static-export safety', () => {
  it('the bridge imports only pure provider data — no client, no fetch', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/music-stream-bed.ts'), 'utf8');
    expect(src).toContain("from './music-stream-providers'");
    // Importing the search client here would drag its API-key reads and fetch
    // into the music bed chunk of the Pages export, where no key exists.
    expect(src).not.toContain("from './music-stream'");
    expect(src).toContain("from './music-playback-plan'");
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/process\.env/);
    expect(src).not.toMatch(/NEXT_PUBLIC_/);
  });

  it('the routing gate lives in an inert module, re-exported for compat', () => {
    const plan = fs.readFileSync(path.join(ROOT, 'lib/music-playback-plan.ts'), 'utf8');
    expect(plan).not.toMatch(/\bfetch\s*\(/);
    expect(plan).not.toMatch(/XMLHttpRequest/);
    expect(plan).not.toMatch(/process\.env/);
    expect(plan).not.toMatch(/NEXT_PUBLIC_/);
    // The network client keeps exporting the gate, so existing imports and
    // tests of `musicPlaybackPlan` from lib/music-stream still resolve.
    const client = fs.readFileSync(path.join(ROOT, 'lib/music-stream.ts'), 'utf8');
    expect(client).toContain("export { musicAttributionLine, musicPlaybackPlan } from './music-playback-plan'");
  });

  it('lib/music.ts never calls the key-gated search client', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/music.ts'), 'utf8');
    expect(src).not.toContain('searchMusic(');
    expect(src).not.toContain('createMusicStream(');
    expect(src).not.toContain('NEXT_PUBLIC_');
  });
});
