import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
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
    const ask = 'What are you thinking about today?';
    expect(spokenLineLooksBroken(ask, { mode: 'idle' })).toBe(true);
    expect(spokenLineLooksBroken(ask, { mode: 'local' })).toBe(false);
  });

  it('keeps finished companion statements', () => {
    expect(
      spokenLineLooksBroken('Looking at a pocket map made me think of you, softly.', { mode: 'idle' }),
    ).toBe(false);
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
    expect(open.toLowerCase()).not.toMatch(/on your mind|what are you thinking/);
    expect(open.toLowerCase()).toContain('talk about');
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
