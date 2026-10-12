import { describe, it, expect } from 'vitest';
import { CHARACTERS, LANGS, type Lang } from '../lib/prefs';
import { CHARACTER_POSES, POKE_STYLE, pokeStyleFor, poseIdsFor } from '../lib/persona';
import { CHARACTER_IDLE, CHARACTER_POKE, pickIdleLine, pickPokeLine } from '../lib/persona-chatter';
import { CHATTER } from '../lib/chatter';
import { VOICE_MATRIX } from '../lib/voice';
import { IDLE_POSES, posesByIds, sampleIdlePoseFrom } from '@amoji/vrm-renderer';

const POSE_IDS = new Set(IDLE_POSES.map((p) => p.id));
const LANG_IDS = LANGS.map((l) => l.id) as Lang[];
const TWISTS = ['playful', 'startled', 'unimpressed', 'flustered', 'challenging'];
const FACES = ['happy', 'surprised', 'angry', 'relaxed'];

const IDLE_HOOK = /[?？~〜]$/;
const POKE_HOOK = /[?？!！~〜…]$/;

describe('per-character persona coverage', () => {
  it('every character has ≥3 curated idle poses (explicit or default)', () => {
    for (const c of CHARACTERS) {
      const ids = poseIdsFor(c.id);
      expect(ids.length, `${c.id} pose count`).toBeGreaterThanOrEqual(3);
      expect(new Set(ids).size, `${c.id} distinct poses`).toBeGreaterThanOrEqual(3);
      for (const id of ids) expect(POSE_IDS.has(id), `${c.id} → ${id}`).toBe(true);
    }
  });

  it('posesByIds resolves the subset and the sampler stays inside it', () => {
    const ids = poseIdsFor('a01-shino');
    const subset = posesByIds(ids);
    expect(subset.length).toBe(ids.length);
    const subsetIds = new Set(subset.map((p) => p.id));
    for (const t of [0, 1234, 8000, 15000, 33333, 99999]) {
      expect(subsetIds.has(sampleIdlePoseFrom(t, 42, subset).id)).toBe(true);
    }
    expect(posesByIds([]).length).toBe(IDLE_POSES.length);
    expect(posesByIds(['nope']).length).toBe(IDLE_POSES.length);
    expect(poseIdsFor('unknown-char').length).toBeGreaterThanOrEqual(3);
  });

  it('every character has a poke style with valid flavor values', () => {
    for (const c of CHARACTERS) {
      const style = pokeStyleFor(c.id);
      expect(TWISTS, `${c.id} twist`).toContain(style.twist);
      expect(FACES, `${c.id} face`).toContain(style.face);
      expect(style.squash).toBeGreaterThan(0);
      expect(style.squash).toBeLessThanOrEqual(0.15);
    }
  });

  it('idle and poke lines resolve (curated bank or generic fallback)', () => {
    for (const c of CHARACTERS) {
      for (const lang of LANG_IDS) {
        expect(pickIdleLine(c.id, lang, 0).trim().length).toBeGreaterThan(0);
        expect(pickPokeLine(c.id, lang, 0).trim().length).toBeGreaterThan(0);
      }
    }
    if (CHARACTER_IDLE.juno) {
      expect(pickIdleLine('juno', 'en', 0)).toBe(CHARACTER_IDLE.juno.en![0]);
    }
    if (CHARACTER_POKE.cloud) {
      expect(pickPokeLine('cloud', 'yue', 0)).toBe(CHARACTER_POKE.cloud.yue![0]);
    }
  });

  it('voice matrix covers legacy cast; want-list uses gender fallbacks in voice.ts', () => {
    for (const c of CHARACTERS) {
      const matrix = VOICE_MATRIX[c.id];
      if (matrix) {
        for (const lang of LANG_IDS) {
          const choices = matrix[lang];
          expect(choices?.length).toBeGreaterThan(0);
        }
      } else {
        expect(c.voiceHint?.yue || c.voiceHint?.en, `${c.id} neural hint`).toBeTruthy();
      }
    }
  });

  it('legacy idle/poke banks still end with conversation hooks when present', () => {
    for (const [id, bank] of Object.entries(CHARACTER_IDLE)) {
      if (!CHARACTERS.some((c) => c.id === id)) continue;
      for (const lang of LANG_IDS) {
        const lines = bank[lang];
        if (!lines) continue;
        for (const line of lines) {
          expect(IDLE_HOOK.test(line.trim()), `${id}/${lang}: ${line}`).toBe(true);
        }
      }
    }
    for (const [id, bank] of Object.entries(CHARACTER_POKE)) {
      if (!CHARACTERS.some((c) => c.id === id)) continue;
      for (const lang of LANG_IDS) {
        const lines = bank[lang];
        if (!lines) continue;
        for (const line of lines) {
          expect(POKE_HOOK.test(line.trim()), `${id}/${lang}: ${line}`).toBe(true);
        }
      }
    }
  });

  it('re-engagement banks exist in every language and every line ends with a hook', () => {
    for (const kind of ['reengage', 'reengageSoft'] as const) {
      for (const lang of LANG_IDS) {
        const lines = CHATTER[kind][lang];
        expect(lines, `${kind}/${lang}`).toBeTruthy();
        expect(lines.length, `${kind}/${lang} size`).toBeGreaterThanOrEqual(2);
        for (const line of lines) {
          expect(IDLE_HOOK.test(line.trim()), `${kind}/${lang}: ${line}`).toBe(true);
        }
      }
    }
  });
});
