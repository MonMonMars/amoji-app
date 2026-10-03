import { describe, it, expect } from 'vitest';
import { CHARACTERS, LANGS, type Lang } from '../lib/prefs';
import { CHARACTER_POSES, POKE_STYLE, pokeStyleFor, poseIdsFor } from '../lib/persona';
import { CHARACTER_IDLE, CHARACTER_POKE, pickIdleLine, pickPokeLine } from '../lib/persona-chatter';
import { VOICE_MATRIX } from '../lib/voice';
import { IDLE_POSES, posesByIds, sampleIdlePoseFrom } from '@amoji/vrm-renderer';

const POSE_IDS = new Set(IDLE_POSES.map((p) => p.id));
const LANG_IDS = LANGS.map((l) => l.id) as Lang[];
const TWISTS = ['playful', 'startled', 'unimpressed', 'flustered', 'challenging'];
const FACES = ['happy', 'surprised', 'angry', 'relaxed'];
const FEMALE = new Set([
  'juno', 'nova', 'mochi', 'luna', 'rin', 'tifa', 'aerith', 'kasumi', 'marin', 'ayane', 'hitomi',
  // r2026-10-03.35 registry expansion
  'lydia', 'ruby', 'snowy',
]);

describe('per-character persona coverage', () => {
  it('every character has ≥3 curated idle poses, all valid ids', () => {
    for (const c of CHARACTERS) {
      const ids = poseIdsFor(c.id);
      expect(ids.length, `${c.id} pose count`).toBeGreaterThanOrEqual(3);
      expect(new Set(ids).size, `${c.id} distinct poses`).toBeGreaterThanOrEqual(3);
      for (const id of ids) expect(POSE_IDS.has(id), `${c.id} → ${id}`).toBe(true);
    }
  });

  it('posesByIds resolves the subset and the sampler stays inside it', () => {
    const ids = poseIdsFor('juno');
    const subset = posesByIds(ids);
    expect(subset.length).toBe(ids.length);
    const subsetIds = new Set(subset.map((p) => p.id));
    for (const t of [0, 1234, 8000, 15000, 33333, 99999]) {
      expect(subsetIds.has(sampleIdlePoseFrom(t, 42, subset).id)).toBe(true);
    }
    // empty / unknown input falls back to the full catalog
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
    expect(Object.keys(POKE_STYLE).sort()).toEqual(CHARACTERS.map((c) => c.id).sort());
    expect(Object.keys(CHARACTER_POSES).sort()).toEqual(CHARACTERS.map((c) => c.id).sort());
  });

  it('every character has exactly 10 idle lines per language', () => {
    for (const c of CHARACTERS) {
      const bank = CHARACTER_IDLE[c.id];
      expect(bank, `${c.id} idle bank`).toBeTruthy();
      for (const lang of LANG_IDS) {
        const lines = bank[lang];
        expect(lines, `${c.id}/${lang}`).toHaveLength(10);
        for (const line of lines) expect(line.trim().length).toBeGreaterThan(0);
      }
    }
    // deterministic modulo pick, wraps around the bank
    expect(pickIdleLine('juno', 'en', 0)).toBe(CHARACTER_IDLE.juno!.en![0]);
    expect(pickIdleLine('juno', 'en', 10)).toBe(CHARACTER_IDLE.juno!.en![0]);
  });

  it('every character has exactly 4 poke reactions per language', () => {
    for (const c of CHARACTERS) {
      const bank = CHARACTER_POKE[c.id];
      expect(bank, `${c.id} poke bank`).toBeTruthy();
      for (const lang of LANG_IDS) {
        const lines = bank[lang];
        expect(lines, `${c.id}/${lang}`).toHaveLength(4);
        for (const line of lines) expect(line.trim().length).toBeGreaterThan(0);
      }
    }
    expect(pickPokeLine('cloud', 'yue', 0)).toBe(CHARACTER_POKE.cloud!.yue![0]);
    expect(pickPokeLine('cloud', 'yue', 4)).toBe(CHARACTER_POKE.cloud!.yue![0]);
  });

  it('voice matrix covers every character in every language, gender-correct', () => {
    for (const c of CHARACTERS) {
      const matrix = VOICE_MATRIX[c.id];
      expect(matrix, `${c.id} voice matrix`).toBeTruthy();
      for (const lang of LANG_IDS) {
        const choices = matrix![lang];
        expect(choices, `${c.id}/${lang}`).toBeTruthy();
        expect(choices!.length).toBeGreaterThan(0);
        const names = choices!.flatMap((ch) => ch.names).join(' ').toLowerCase();
        if (FEMALE.has(c.id)) expect(names, `${c.id}/${lang} female voice`).toContain('female');
        else expect(names, `${c.id}/${lang} male voice`).toContain('male');
      }
    }
  });
});
