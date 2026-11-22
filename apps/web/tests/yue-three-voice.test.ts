/**
 * Cantonese (yue) is limited to the owner's three Edge voices — 2026-11-22.
 *
 *   WanLung  zh-HK-WanLungNeural  male   — the ONLY Cantonese male
 *   HiuMaan  zh-HK-HiuMaanNeural  female — calmer
 *   HiuGaai  zh-HK-HiuGaaiNeural  female — brighter
 *
 * The OS fallback tier must stay intact underneath: Apple Sin-ji (female) /
 * Sin-ju (male), then the generic Female/Male token so Windows Tracy/Danny and
 * Android zh-HK still match. No fourth vendor, no paid TTS API.
 *
 * The male assertion is the one that matters: a male companion that silently
 * lands on a female Cantonese voice is the regression this file exists for.
 */
import { describe, expect, it } from 'vitest';
import { edgeCastRoster, edgeCastVoice } from '../lib/edge-cast';
import { VOICE_MATRIX } from '../lib/voice';
import {
  VOICE_CATALOG,
  edgeVoiceIdForTier,
  selectBrowserVoice,
  synthNameList,
} from '../lib/voice-catalog';

const YUE_EDGE = ['zh-HK-HiuGaaiNeural', 'zh-HK-HiuMaanNeural', 'zh-HK-WanLungNeural'] as const;
const EDGE_NAMES = new Set(['WanLung', 'HiuMaan', 'HiuGaai']);
const MALE_NAME = /^(WanLung|Sin-ju|Male)$/i;
const FEMALE_NAME = /^(HiuMaan|HiuGaai|Sin-ji|Female)$/i;

interface TestVoice {
  name: string;
  lang: string;
}

/** The fallback tier the app declares: Edge names + Apple + generic. */
const DECLARED_FALLBACK: readonly TestVoice[] = [
  { name: 'WanLung', lang: 'zh-HK' },
  { name: 'HiuMaan', lang: 'zh-HK' },
  { name: 'HiuGaai', lang: 'zh-HK' },
  { name: 'Sin-ji', lang: 'zh-HK' },
  { name: 'Sin-ju', lang: 'zh-HK' },
  { name: 'Mei-Jia', lang: 'zh-TW' },
];

/** The exact 15 voices Windows 11 exposes (see fixtures/os-voice-fixtures.ts). */
const WINDOWS_YUE: readonly TestVoice[] = [
  { name: 'Microsoft Danny - Chinese (Traditional, Hong Kong S.A.R.)', lang: 'zh-HK' },
  { name: 'Microsoft Tracy - Chinese (Traditional, Hong Kong S.A.R.)', lang: 'zh-HK' },
  { name: 'Microsoft Hanhan - Chinese (Traditional, Taiwan)', lang: 'zh-TW' },
];

const ROSTER = edgeCastRoster();

function yueChoices(characterId: string, gender: 'female' | 'male') {
  return VOICE_MATRIX[characterId]?.yue
    ?? VOICE_MATRIX[gender === 'male' ? 'atlas' : 'juno']?.yue
    ?? [];
}

/** Mirrors the matrix loop in voice.ts pickVoice(). */
function resolveMatrix(
  characterId: string,
  gender: 'female' | 'male',
  voices: readonly TestVoice[],
): TestVoice | null {
  for (const choice of yueChoices(characterId, gender)) {
    const scoped = voices.filter((v) => v.lang.toLowerCase().startsWith(choice.lang.toLowerCase()));
    const hit = selectBrowserVoice(scoped, gender, choice.names);
    if (hit) return hit;
  }
  return null;
}

function matrixGender(characterId: string): 'female' | 'male' {
  const roster = ROSTER.find((c) => c.id === characterId);
  if (roster) return roster.gender;
  return yueChoices(characterId, 'female')[0]?.names.includes('Male') ? 'male' : 'female';
}

describe('Cantonese Edge pool — exactly the owner’s three voices', () => {
  it('lists no Cantonese Edge voice beyond WanLung / HiuMaan / HiuGaai', () => {
    const edgeYue = VOICE_CATALOG.filter((v) => v.locale === 'yue' && v.engine === 'edge');
    expect([...new Set(edgeYue.map((v) => v.id))].sort()).toEqual([...YUE_EDGE].sort());
    expect(edgeYue.every((v) => v.shipping)).toBe(true);
  });

  it('never resolves a pitch tier to a fourth Cantonese Edge id', () => {
    const ids = new Set(
      (['deep', 'mid', 'bright'] as const).flatMap((tier) =>
        (['female', 'male'] as const).map((gender) => edgeVoiceIdForTier('yue', gender, tier)),
      ),
    );
    expect([...ids].sort()).toEqual([...YUE_EDGE].sort());
  });

  it('assigns the whole roster out of the same three ids', () => {
    expect(ROSTER.length).toBeGreaterThan(40);
    const used = new Set(ROSTER.map((c) => edgeCastVoice(c.id, 'yue')!.id));
    expect([...used].sort()).toEqual([...YUE_EDGE].sort());
  });
});

describe('male cast reaches a male Cantonese voice', () => {
  const males = ROSTER.filter((c) => c.gender === 'male');

  it('has male characters to check', () => {
    expect(males.length).toBeGreaterThan(0);
  });

  it('every male gets WanLung on Edge and a male name on the OS fallback', () => {
    for (const c of males) {
      expect(edgeCastVoice(c.id, 'yue')!.id, c.id).toBe('zh-HK-WanLungNeural');

      const choices = yueChoices(c.id, 'male');
      const first = choices[0]!;
      expect(first.names[0], c.id).toBe('WanLung');
      for (const name of first.names) expect(name, `${c.id} ${name}`).toMatch(MALE_NAME);

      const declared = resolveMatrix(c.id, 'male', DECLARED_FALLBACK);
      expect(declared, c.id).not.toBeNull();
      expect(declared!.name, c.id).toMatch(MALE_NAME);

      // A stock Windows zh-HK pair is Tracy + Danny. Danny must win.
      const windows = resolveMatrix(c.id, 'male', WINDOWS_YUE);
      expect(windows, c.id).not.toBeNull();
      expect(windows!.name, c.id).toMatch(/Danny/);
    }
  });
});

describe('female cast reaches a female Cantonese voice', () => {
  const females = ROSTER.filter((c) => c.gender === 'female');

  it('every female gets HiuMaan/HiuGaai on Edge and never WanLung on fallback', () => {
    for (const c of females) {
      const edge = edgeCastVoice(c.id, 'yue')!;
      expect(['zh-HK-HiuMaanNeural', 'zh-HK-HiuGaaiNeural'], c.id).toContain(edge.id);

      const first = yueChoices(c.id, 'female')[0]!;
      expect(['HiuMaan', 'HiuGaai'], c.id).toContain(first.names[0]);
      expect(first.names, c.id).not.toContain('WanLung');
      expect(first.names, c.id).not.toContain('Sin-ju');
      expect(first.names, c.id).not.toContain('Male');

      const declared = resolveMatrix(c.id, 'female', DECLARED_FALLBACK);
      expect(declared, c.id).not.toBeNull();
      expect(declared!.name, c.id).toMatch(FEMALE_NAME);

      const windows = resolveMatrix(c.id, 'female', WINDOWS_YUE);
      expect(windows, c.id).not.toBeNull();
      expect(windows!.name, c.id).toMatch(/Tracy/);
    }
  });
});

describe('OS fallback tier is intact', () => {
  it('keeps Sin-ji (female) and Sin-ju (male) in the synth name list', () => {
    expect(synthNameList('yue', 'female')).toContain('Sin-ji');
    expect(synthNameList('yue', 'male')).toContain('Sin-ju');
  });

  it('keeps both Apple fallback rows in the catalog, shipping', () => {
    const speech = VOICE_CATALOG.filter((v) => v.locale === 'yue' && v.engine === 'speech');
    expect(speech.some((v) => v.id === 'Sin-ji' && v.gender === 'female' && v.shipping)).toBe(true);
    expect(speech.some((v) => v.id === 'Sin-ju' && v.gender === 'male' && v.shipping)).toBe(true);
    // Android/Chrome's generic Cantonese name still matches.
    expect(speech.some((v) => v.id === '粤語' && v.shipping)).toBe(true);
  });

  it('never puts zh-TW Mei-Jia ahead of the zh-HK fallback', () => {
    for (const id of Object.keys(VOICE_MATRIX)) {
      const choices = VOICE_MATRIX[id]?.yue ?? [];
      const firstHk = choices.findIndex((c) => c.lang.toLowerCase() === 'zh-hk');
      const firstTw = choices.findIndex((c) => c.lang.toLowerCase() === 'zh-tw');
      if (firstTw < 0) continue;
      expect(firstHk, id).toBeGreaterThanOrEqual(0);
      expect(firstHk, id).toBeLessThan(firstTw);
      expect(choices[firstHk]!.names, id).not.toContain('Mei-Jia');
    }
  });
});

describe('no character resolves an empty Cantonese voice', () => {
  it('every matrix id resolves on a device that has the declared fallbacks', () => {
    for (const id of Object.keys(VOICE_MATRIX)) {
      const gender = matrixGender(id);
      const hit = resolveMatrix(id, gender, DECLARED_FALLBACK);
      expect(hit, id).not.toBeNull();
      expect(hit!.lang.toLowerCase(), id).toMatch(/^zh-(hk|tw)/);
    }
  });

  it('every yue list starts on one of the three Edge names', () => {
    for (const id of Object.keys(VOICE_MATRIX)) {
      const first = VOICE_MATRIX[id]?.yue?.[0];
      if (!first) continue;
      expect(first.lang, id).toBe('zh-HK');
      expect(EDGE_NAMES.has(first.names[0]!), `${id} ${first.names[0]}`).toBe(true);
    }
  });
});
