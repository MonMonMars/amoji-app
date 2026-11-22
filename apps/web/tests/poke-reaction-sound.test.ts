/**
 * Poke reaction sound invariants.
 *
 * Owner report: "the poke reaction sound is always not correct". Three things
 * used to be able to produce that, and each is pinned here:
 *   1. a zone path that does not exist on disk (404 -> silence),
 *   2. a male character resolving to a female clip (or the reverse),
 *   3. the clip not fitting the reaction window (it would still be sounding
 *      after the body settled, which reads as the wrong sound).
 *
 * NOTE on ordering: lib/voice.ts `playPokeBurst` enqueues the zone clip AFTER
 * the spoken poke line in the serial speech queue, so with Voice replies on the
 * clip starts after that sentence - outside POKE_REACTION_MS. That is a real
 * remaining defect in a file this branch is not allowed to edit; see the
 * handoff report. These tests keep the selection side honest meanwhile.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CLIP_LIBRARY,
  RECORDED_POKE_ZONE,
  VOICE_CLIP_GENDERS,
  pokeZoneClipPaths,
  recordedPokeClip,
} from '../lib/voice-clips';
import { CMA_REACTION_GALLERY, cmaCodeFromPath } from '../lib/cma-reaction-gallery';
import { POKE_REACTION_MS } from '../lib/poke-hit';

const here = dirname(fileURLToPath(import.meta.url));
const publicFile = (rel: string) => join(here, '../public', rel.replace(/^\//, ''));

const ZONES = [
  'head', 'torso', 'chest', 'side', 'back', 'armL', 'armR',
  'belly', 'butt', 'hand', 'legL', 'legR', 'foot',
] as const;

describe('poke reaction sound: files and gender', () => {
  it('every zone clip for both genders exists on disk', () => {
    for (const gender of VOICE_CLIP_GENDERS) {
      for (const zone of ZONES) {
        const rel = recordedPokeClip(gender, zone);
        expect(existsSync(publicFile(rel)), `${gender} ${zone} -> ${rel}`).toBe(true);
      }
    }
  });

  it('gender sets never cross: male never gets a female clip and vice versa', () => {
    for (const zone of ZONES) {
      const girl = recordedPokeClip('female', zone);
      const boy = recordedPokeClip('male', zone);
      expect(girl, `female ${zone}`).toContain('_female_');
      expect(girl, `female ${zone}`).not.toContain('_male_');
      expect(boy, `male ${zone}`).toContain('_male_');
      expect(boy, `male ${zone}`).not.toContain('_female_');
      expect(girl).not.toBe(boy);
    }
    expect(recordedPokeClip('female')).not.toBe(recordedPokeClip('male'));
  });

  it('a zone always answers with the same clip (no random rotation)', () => {
    for (const gender of VOICE_CLIP_GENDERS) {
      for (const zone of ZONES) {
        const first = recordedPokeClip(gender, zone);
        for (let i = 0; i < 4; i += 1) {
          expect(recordedPokeClip(gender, zone)).toBe(first);
        }
      }
    }
  });

  it('female zones are distinguishable; every male zone has a male clip', () => {
    expect(recordedPokeClip('female', 'head')).not.toBe(recordedPokeClip('female', 'belly'));
    expect(recordedPokeClip('female', 'chest')).not.toBe(recordedPokeClip('female', 'torso'));
    for (const zone of ZONES) {
      expect(recordedPokeClip('male', zone)).toMatch(/CMA00318_universal_male_effort\.mp3$/);
    }
  });

  it('every mapped clip fits the reaction window', () => {
    const sec = POKE_REACTION_MS / 1000;
    for (const gender of VOICE_CLIP_GENDERS) {
      for (const path of pokeZoneClipPaths(gender)) {
        const code = cmaCodeFromPath(path);
        const row = CMA_REACTION_GALLERY.find((c) => c.code === code);
        expect(row, path).toBeTruthy();
        expect(row!.durationSec, path).toBeLessThanOrEqual(sec);
      }
    }
  });
});

describe('r282 owner reaction pack is present and registered', () => {
  // Added with the in-chat idle picker (r282). These are the real ouch / yelp /
  // hmm / haha takes; a missing id here is exactly "the sound is never right".
  const expected: Record<'female' | 'male', readonly string[]> = {
    female: ['haha', 'hmm', 'ouch', 'yelp', 'hiccup'],
    male: ['um', 'haha', 'hmm', 'ouch', 'yelp', 'yawn'],
  };

  it('files exist under universal/{gender}', () => {
    for (const gender of VOICE_CLIP_GENDERS) {
      for (const stem of expected[gender]) {
        expect(
          existsSync(join(here, `../public/voice-clips/universal/${gender}/${stem}.mp3`)),
          `${gender}/${stem}`,
        ).toBe(true);
      }
    }
  });

  it('every registered universal clip exists on disk', () => {
    for (const file of CLIP_LIBRARY.universal.female) {
      expect(existsSync(join(here, `../public/voice-clips/universal/female/${file}`)), file).toBe(true);
    }
    for (const file of CLIP_LIBRARY.universal.male) {
      expect(existsSync(join(here, `../public/voice-clips/universal/male/${file}`)), file).toBe(true);
    }
  });

  it('the pack stays gendered (no male take listed for females)', () => {
    const female = new Set<string>(CLIP_LIBRARY.universal.female);
    for (const stem of expected.male) {
      if (stem === 'um') continue; // both genders ship an um take
      expect(female.has(`${stem}.mp3`), stem).toBe(expected.female.includes(stem));
    }
  });
});

/**
 * KNOWN DEFECT, deliberately skipped so CI stays green while voice.ts is owned
 * by the concurrent voice-routing branch. lib/voice.ts `playPokeBurst` calls
 * `speak(...)` first and then `lineQueue.enqueue(clipFile)`; LineQueue is
 * strictly serial, so with Voice replies on the recorded reaction starts only
 * after the full spoken sentence and lands outside POKE_REACTION_MS. Flipping
 * this test on is the acceptance check for the fix (enqueue the clip first).
 */
describe.skip('poke SFX ordering (blocked on voice.ts ownership)', () => {
  it('queues the zone clip before the spoken line', () => {
    const voice = readFileSync(join(here, '../lib/voice.ts'), 'utf8');
    const burst = voice.slice(
      voice.indexOf('export function playPokeBurst'),
      voice.indexOf('export function playLaughBurst'),
    );
    const speakAt = burst.indexOf('speak(');
    const clipAt = burst.indexOf('lineQueue.enqueue(');
    expect(speakAt).toBeGreaterThan(-1);
    expect(clipAt).toBeGreaterThan(-1);
    expect(clipAt).toBeLessThan(speakAt);
  });
});

describe('poke SFX is wired through one call site with the hit zone', () => {
  it('ChatPanel forwards the poked zone (not a constant torso)', () => {
    const panel = readFileSync(join(here, '../components/ChatPanel.tsx'), 'utf8');
    expect(panel).toContain("playPokeBurst(characterId, lang, pokeZone || 'torso', pokeCount)");
    const page = readFileSync(join(here, '../app/chat/page.tsx'), 'utf8');
    expect(page).toContain('setPokeZone(zone)');
  });

  it('the owner zone table is the only source (no parallel poke clip registry)', () => {
    expect(RECORDED_POKE_ZONE.female.chest).toBe(recordedPokeClip('female', 'breast'));
    expect(RECORDED_POKE_ZONE.male.chest).toBe(recordedPokeClip('male', 'belly'));
  });
});
