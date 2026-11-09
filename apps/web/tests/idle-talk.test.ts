import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  SUGGEST_TOPIC_LINES,
  STAY_TOPIC_LINES,
  idleTalkMode,
  nextIdleMotif,
  pickIdleCompanionLine,
  resetIdleTalkRecent,
} from '../lib/idle-talk';
import {
  MOTIFS,
  VOICE_IDS,
  isIncompleteIdleLine,
  voiceIdleLines,
  voiceOpening,
} from '../lib/personality-voice';
import { asksUserInnerThoughts, spokenLineLooksBroken } from '../lib/spoken-line-sanity';
import { CHATTER } from '../lib/chatter';
import { CHARACTERS, type Lang } from '../lib/prefs';

const LANGS: Lang[] = ['en', 'yue', 'zh', 'ja'];

/** Pixel idle bug: motif fill produced a broken English / truncated CJK fragment. */
const FORBIDDEN_IDLE_FRAGMENTS = [
  /a small map reminding you/i,
  /a tiny map reminded(?: me of you)?/i,
  /a tiny map is small/i,
  /A little maps feels/i,
  /Um, maps makes/i,
  /^maps is\b/i,
  /提醒我你/,
  /轻轻提醒我想起你/,
];

/** Pixel: never interrogate private thoughts in idle / open / reengage. */
const FORBIDDEN_THOUGHT_ASK = [
  /what are you thinking/i,
  /\bare you thinking\b/i,
  /what(?:'s| is) on your mind/i,
  /penny for your thoughts/i,
  /你諗緊咩/,
  /你在想什么/,
  /你在想什麼/,
  /何を考えてる/,
  /なに考えてる/,
  /頭の中で何が/,
];

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
    resetIdleTalkRecent();
    const sample = CHARACTERS.slice(0, 6);
    for (const c of sample) {
      for (const lang of LANGS) {
        for (let n = 0; n < 9; n++) {
          const line = pickIdleCompanionLine(c.id, c.gender, lang, n).trim();
          expect(line.length, `${c.id}/${lang}/${n}`).toBeGreaterThan(0);
          expect(line, `${c.id}/${lang}/${n}`).not.toMatch(/[?？]/);
          expect(line.toLowerCase(), `${c.id}/${lang}/${n}`).not.toMatch(/thinking about|i was thinking|think out loud/);
          expect(asksUserInnerThoughts(line), `${c.id}/${lang}/${n}`).toBe(false);
        }
      }
    }
  });

  it('stay/suggest banks are statement-only across langs', () => {
    for (const lang of LANGS) {
      for (const line of [...STAY_TOPIC_LINES[lang], ...SUGGEST_TOPIC_LINES[lang]]) {
        expect(line.trim()).not.toMatch(/[?？]/);
      }
    }
  });

  it('suppresses recently used topic bank lines when possible', () => {
    resetIdleTalkRecent();
    const a = pickIdleCompanionLine(CHARACTERS[0]!.id, CHARACTERS[0]!.gender, 'en', 0);
    const b = pickIdleCompanionLine(CHARACTERS[0]!.id, CHARACTERS[0]!.gender, 'en', 3);
    // n%3===0 hits topic banks; consecutive topic beats should prefer a fresh line
    expect(a.trim().length).toBeGreaterThan(0);
    expect(b.trim().length).toBeGreaterThan(0);
    expect(b).not.toBe(a);
  });

  it('forbids the Pixel nonsense map line and half-template idle fills', () => {
    expect(isIncompleteIdleLine('a small map reminding you')).toBe(true);
    expect(isIncompleteIdleLine('a tiny map reminded me of you in a soft way.')).toBe(true);
    expect(isIncompleteIdleLine('一張細地圖輕輕提醒我你。')).toBe(true);
    expect(isIncompleteIdleLine('{thing} reminded me of you')).toBe(true);
    expect(isIncompleteIdleLine('')).toBe(true);
    expect(isIncompleteIdleLine('Looking at a pocket map made me think of you, softly.')).toBe(false);
    expect(spokenLineLooksBroken('a small map reminding you')).toBe(true);

    for (const voice of VOICE_IDS) {
      for (const motif of MOTIFS) {
        for (const lang of LANGS) {
          for (const line of voiceIdleLines(voice, motif, 0, lang)) {
            expect(isIncompleteIdleLine(line), `${voice}/${motif}/${lang}: ${line}`).toBe(false);
            expect(asksUserInnerThoughts(line), `${voice}/${motif}/${lang}: ${line}`).toBe(false);
            for (const re of FORBIDDEN_IDLE_FRAGMENTS) {
              expect(line, `${voice}/${motif}/${lang}: ${line}`).not.toMatch(re);
            }
          }
        }
      }
    }

    resetIdleTalkRecent();
    for (const c of CHARACTERS.slice(0, 8)) {
      for (const lang of LANGS) {
        for (let n = 0; n < 24; n++) {
          const line = pickIdleCompanionLine(c.id, c.gender, lang, n);
          expect(isIncompleteIdleLine(line), `${c.id}/${lang}/${n}: ${line}`).toBe(false);
          expect(asksUserInnerThoughts(line), `${c.id}/${lang}/${n}: ${line}`).toBe(false);
          for (const re of [...FORBIDDEN_IDLE_FRAGMENTS, ...FORBIDDEN_THOUGHT_ASK]) {
            expect(line, `${c.id}/${lang}/${n}: ${line}`).not.toMatch(re);
          }
        }
      }
    }
  });

  it('forbids thought-interrogation in reengage, openings, and idle banks', () => {
    expect(asksUserInnerThoughts('What are you thinking about?')).toBe(true);
    expect(asksUserInnerThoughts("Penny for your thoughts — what's on your mind?")).toBe(true);
    expect(asksUserInnerThoughts('你諗緊咩呀？')).toBe(true);
    expect(asksUserInnerThoughts('你在想什么呀？')).toBe(true);
    expect(asksUserInnerThoughts('今、何を考えてる？')).toBe(true);
    expect(asksUserInnerThoughts('Still here with you in this quiet stretch.')).toBe(false);
    expect(asksUserInnerThoughts('Looking at a pocket map made me think of you, softly.')).toBe(false);

    for (const lang of LANGS) {
      for (const kind of ['idleBored', 'idleCozy', 'reengage', 'reengageSoft'] as const) {
        for (const line of CHATTER[kind][lang]) {
          expect(asksUserInnerThoughts(line), `${kind}/${lang}: ${line}`).toBe(false);
          for (const re of FORBIDDEN_THOUGHT_ASK) {
            expect(line, `${kind}/${lang}: ${line}`).not.toMatch(re);
          }
        }
      }
      for (const voice of VOICE_IDS) {
        const open = voiceOpening(voice, 'maps', 0, lang, 'Amoji');
        expect(asksUserInnerThoughts(open), `open/${voice}/${lang}: ${open}`).toBe(false);
        for (const re of FORBIDDEN_THOUGHT_ASK) {
          expect(open, `open/${voice}/${lang}: ${open}`).not.toMatch(re);
        }
      }
    }
  });
});

describe('idle tips gate', () => {
  it('ChatPanel idle path does not inject personalityTutorTip / APP_TIPS', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const chat = fs.readFileSync(path.resolve(here, '../components/ChatPanel.tsx'), 'utf8');
    expect(chat).not.toContain('personalityTutorTip');
    expect(chat).not.toMatch(/n\s*%\s*6\s*===\s*5/);
    expect(chat).toContain('pickIdleCompanionLine');
    expect(chat).toContain('pickSceneLine(backgroundId');
    expect(chat).toContain('gateSpokenLine');
  });
});
