import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  asksUserInnerThoughts,
  gateSpokenLine,
  safeIdleFallback,
  spokenLineLooksBroken,
} from '../lib/spoken-line-sanity';
import {
  MOTIFS,
  VOICE_IDS,
  isIncompleteIdleLine,
  voiceIdleLines,
  voiceOpening,
} from '../lib/personality-voice';
import { pickIdleCompanionLine, resetIdleTalkRecent } from '../lib/idle-talk';
import { CHARACTERS, type Lang } from '../lib/prefs';

const LANGS: Lang[] = ['en', 'yue', 'zh', 'ja'];
const KNOWN_BAD = [
  'a small map reminding you',
  'a tiny map reminded me of you in a soft way.',
  '{thing} reminded me of you',
  '一張細地圖輕輕提醒我你。',
  'What are you thinking?',
  "What's on your mind?",
  "What's your quiet thought right now?",
  'What shall we think about today?',
  '你諗緊咩呀？',
  '你在想什么？',
  '今、何を考えてる？',
  '今日は何を考えよう？',
  '你而家嘅安靜諗法係咩呀？',
  '你现在的安静想法是什么呀？',
  '今一番頭にあるのは何？',
];

describe('spokenLineLooksBroken', () => {
  it('rejects empty, templates, and known Pixel fragments', () => {
    expect(spokenLineLooksBroken('')).toBe(true);
    expect(spokenLineLooksBroken('…')).toBe(true);
    expect(spokenLineLooksBroken('{thing} sits nearby')).toBe(true);
    expect(spokenLineLooksBroken('a small map reminding you')).toBe(true);
    expect(spokenLineLooksBroken('a tiny map reminded me of you')).toBe(true);
    expect(spokenLineLooksBroken('一張細地圖輕輕提醒我你。')).toBe(true);
  });

  it('rejects banned idle interrogations only in idle mode', () => {
    const asks = [
      'What are you thinking about today?',
      "What's your quiet thought right now?",
      'What shall we think about today?',
      '今、何を考えてる？',
      '今日は何を考えよう？',
      '你现在的安静想法是什么呀？',
      '你而家嘅安靜諗法係咩呀？',
      '今一番頭にあるのは何？',
    ];
    for (const ask of asks) {
      expect(asksUserInnerThoughts(ask), ask).toBe(true);
      expect(spokenLineLooksBroken(ask, { mode: 'idle' }), ask).toBe(true);
      expect(spokenLineLooksBroken(ask, { mode: 'local' }), ask).toBe(false);
    }
    expect(asksUserInnerThoughts('Looking at a pocket map made me think of you, softly.')).toBe(false);
  });

  it('keeps finished companion statements', () => {
    expect(
      spokenLineLooksBroken('Looking at a pocket map made me think of you, softly.', { mode: 'idle' }),
    ).toBe(false);
    expect(
      spokenLineLooksBroken('a pocket map. Noted and left within reach.', { mode: 'idle' }),
    ).toBe(false);
    expect(
      spokenLineLooksBroken('a pocket map is acceptable company for this pause.', { mode: 'idle' }),
    ).toBe(false);
    expect(spokenLineLooksBroken('of you', { mode: 'idle' })).toBe(true);
    expect(spokenLineLooksBroken('a map', { mode: 'idle' })).toBe(true);
  });
});

describe('gateSpokenLine', () => {
  it('falls back to a safe idle line for known bad strings', () => {
    for (const bad of KNOWN_BAD) {
      const gated = gateSpokenLine(bad, { mode: 'idle', lang: 'en', n: 0 });
      expect(gated, bad).toBeTruthy();
      expect(spokenLineLooksBroken(gated!, { mode: 'idle' }), gated).toBe(false);
    }
  });

  it('safeIdleFallback is always speakable', () => {
    for (const lang of LANGS) {
      expect(spokenLineLooksBroken(safeIdleFallback(lang, 0), { mode: 'idle', lang })).toBe(false);
    }
  });
});

describe('source banks never emit known nonsense', () => {
  it('voiceIdleLines pass the gate across voices/motifs/langs', () => {
    for (const voice of VOICE_IDS) {
      for (const motif of MOTIFS) {
        for (const lang of LANGS) {
          const lines = voiceIdleLines(voice, motif, 0, lang);
          expect(lines.length, `${voice}/${motif}/${lang}`).toBeGreaterThan(0);
          for (const line of lines) {
            expect(isIncompleteIdleLine(line), `${voice}/${motif}/${lang}: ${line}`).toBe(false);
          }
        }
      }
    }
  });

  it('steady openings no longer ask what you are thinking', () => {
    const open = voiceOpening('steady', 'maps', 0, 'en', 'Ada');
    expect(open.toLowerCase()).not.toMatch(/on your mind|what are you thinking|quiet thought/);
    expect(open.toLowerCase()).toContain('talk about');
  });

  it('persona idle banks no longer ask thinking interrogations', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const src = fs.readFileSync(path.resolve(here, '../lib/persona-chatter.ts'), 'utf8');
    expect(src).not.toMatch(/What are you thinking/i);
    expect(src).not.toMatch(/What'?s on your mind/i);
    expect(src).not.toMatch(/What'?s your quiet thought/i);
    expect(src).not.toMatch(/What shall we think about/i);
    expect(src).not.toMatch(/今、何を考えてる？/);
    expect(src).not.toMatch(/今日は何を考えよう？/);
    expect(src).not.toMatch(/心入面諗緊咩/);
    expect(src).not.toMatch(/心里面在想什么/);
    expect(src).not.toMatch(/你现在的安静想法是什么/);
    expect(src).not.toMatch(/你而家嘅安靜諗法係咩/);
    expect(src).not.toMatch(/今一番頭にあるのは何/);
  });

  it('pickIdleCompanionLine never returns known bad fragments', () => {
    resetIdleTalkRecent();
    for (const c of CHARACTERS.slice(0, 8)) {
      for (const lang of LANGS) {
        for (let n = 0; n < 18; n++) {
          const line = pickIdleCompanionLine(c.id, c.gender, lang, n);
          expect(spokenLineLooksBroken(line, { mode: 'idle', lang }), `${c.id}/${lang}/${n}: ${line}`).toBe(false);
        }
      }
    }
  });

  it('ChatPanel sayLocal wires the spoken-line gate for idle', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const chat = fs.readFileSync(path.resolve(here, '../components/ChatPanel.tsx'), 'utf8');
    expect(chat).toContain("from '../lib/spoken-line-sanity'");
    expect(chat).toContain('gateSpokenLine');
    expect(chat).toContain('idle: true');
  });
});
