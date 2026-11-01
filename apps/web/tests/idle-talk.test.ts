import { describe, expect, it } from 'vitest';
import {
  SUGGEST_TOPIC_LINES,
  STAY_TOPIC_LINES,
  idleTalkMode,
  nextIdleMotif,
  pickIdleCompanionLine,
} from '../lib/idle-talk';
import { MOTIFS } from '../lib/personality-voice';
import { CHARACTERS, LANGS, type Lang } from '../lib/prefs';

const LANG_IDS = LANGS.map((l) => l.id) as Lang[];

describe('idle-talk', () => {
  it('rotates motifs away from a sticky first slot', () => {
    const first = nextIdleMotif(0, MOTIFS[0]);
    const second = nextIdleMotif(1, MOTIFS[0]);
    expect(first).not.toBe(MOTIFS[0]);
    expect(second).not.toBe(first);
    expect(MOTIFS).toContain(first);
  });

  it('alternates stay vs suggest modes', () => {
    expect(idleTalkMode(0)).toBe('stay');
    expect(idleTalkMode(1)).toBe('suggest');
    expect(idleTalkMode(2)).toBe('stay');
  });

  it('emits statement-only companion idle lines (no questions)', () => {
    const sample = CHARACTERS.slice(0, 6);
    for (const c of sample) {
      for (const lang of LANG_IDS) {
        for (let n = 0; n < 9; n++) {
          const line = pickIdleCompanionLine(c.id, c.gender, lang, n).trim();
          expect(line.length, `${c.id}/${lang}/${n}`).toBeGreaterThan(0);
          expect(line, `${c.id}/${lang}/${n}`).not.toMatch(/[?？]/);
          expect(line.toLowerCase(), `${c.id}/${lang}/${n}`).not.toMatch(/thinking about|i was thinking|think out loud/);
        }
      }
    }
  });

  it('stay/suggest banks are statement-only across langs', () => {
    for (const lang of LANG_IDS) {
      for (const line of [...STAY_TOPIC_LINES[lang], ...SUGGEST_TOPIC_LINES[lang]]) {
        expect(line.trim()).not.toMatch(/[?？]/);
      }
    }
  });
});
