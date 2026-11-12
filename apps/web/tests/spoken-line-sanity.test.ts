import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  asksPresenceNag,
  asksToResumeHistory,
  asksUserInnerThoughts,
  capCompanionReplyQuestions,
  capSpokenQuestions,
  countSpokenQuestions,
  gateSpokenLine,
  isTopicMenuAsk,
  openGreetTooManyQuestions,
  safeIdleFallback,
  scrubTopicMenuAsks,
  spokenLineLooksBroken,
  stripQuestionSentences,
  userMessageLooksLikeQuestion,
} from '../lib/spoken-line-sanity';
import { buildOpenCheerLine } from '../lib/open-phase';
import { LAST_THREAD_RESUME_BANNED } from '../lib/memory';
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
  'Last time we were talking about "hiking" — want to pick it back up?',
  "It's been a minute... want to pick up where we left off?",
  '我们上次聊到「爬山」——要不要继续那个话题？',
  '前回は「登山」の話してたね——続き、話す？',
];

describe('spokenLineLooksBroken', () => {
  it('rejects empty, templates, and known Pixel fragments', () => {
    expect(spokenLineLooksBroken('')).toBe(true);
    expect(spokenLineLooksBroken('…')).toBe(true);
    expect(spokenLineLooksBroken('{thing} sits nearby')).toBe(true);
    expect(spokenLineLooksBroken('a small map reminding you')).toBe(true);
    expect(spokenLineLooksBroken('a tiny map reminded me of you')).toBe(true);
    expect(spokenLineLooksBroken('一張細地圖輕輕提醒我你。')).toBe(true);
    expect(spokenLineLooksBroken('一個小謎語充滿電，等一陣細爆發。')).toBe(true);
    expect(spokenLineLooksBroken('{thing} is charged and ready for a tiny burst.')).toBe(true);
    expect(spokenLineLooksBroken('Still on that thread with you — no rush to leave it.')).toBe(true);
    expect(spokenLineLooksBroken('Holding this soft moment with you.')).toBe(true);
    expect(spokenLineLooksBroken('I nicknamed a friendly riddle after this soft moment.')).toBe(true);
    expect(spokenLineLooksBroken('我用呢個柔軟瞬間幫小謎語改名。')).toBe(true);
    expect(spokenLineLooksBroken('Your quantum vibes are aligning today.')).toBe(true);
    expect(spokenLineLooksBroken('個vibe好靚喎。')).toBe(true);
    expect(spokenLineLooksBroken('Vibes check. What are we vibing to?')).toBe(true);
    expect(spokenLineLooksBroken('搵到首歌啱你個vibe。想知歌名嗎？')).toBe(true);
  });

  it('rejects presence nags in idle mode', () => {
    expect(asksPresenceNag("You've gone quiet on me — I'm still right here.")).toBe(true);
    expect(asksPresenceNag('Are you still there?')).toBe(true);
    expect(spokenLineLooksBroken("You've gone quiet on me.", { mode: 'idle' })).toBe(true);
    expect(spokenLineLooksBroken('I just stretched my shoulders — feels nice.', { mode: 'idle' })).toBe(false);
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

describe('companion reply question cap', () => {
  it('detects user questions across languages', () => {
    expect(userMessageLooksLikeQuestion('What is the weather?')).toBe(true);
    expect(userMessageLooksLikeQuestion('今日天氣點呀？')).toBe(true);
    expect(userMessageLooksLikeQuestion('今天天气怎么样？')).toBe(true);
    expect(userMessageLooksLikeQuestion('今日の天気は？')).toBe(true);
    expect(userMessageLooksLikeQuestion('今日好攰呀。')).toBe(false);
  });

  it('strips all asks when the user asked something', () => {
    const out = capCompanionReplyQuestions(
      'Today is sunny and mild. Want to go for a walk? How about you?',
      'What is the weather?',
    );
    expect(countSpokenQuestions(out)).toBe(0);
    expect(out).toContain('sunny');
  });

  it('allows at most one check-in when the user did not ask', () => {
    const out = capCompanionReplyQuestions(
      'That sounds exhausting. Rest if you can. Want to vent more? How are you holding up?',
      'I am so tired after work.',
    );
    expect(countSpokenQuestions(out)).toBe(1);
    expect(out).toContain('exhausting');
  });

  it('capSpokenQuestions keeps answer sentences first', () => {
    expect(capSpokenQuestions('A. B? C?', 1)).toBe('A. C?');
  });
});

describe('open greet question cap', () => {
  it('stripQuestionSentences removes trailing asks', () => {
    expect(stripQuestionSentences('Hello. Want to chat?')).toBe('Hello.');
    expect(stripQuestionSentences('你好，我鍾意茶。想傾咩呀？')).toBe('你好，我鍾意茶。');
  });

  it('never keeps stacked topic-menu asks like 我哋傾咩好呀 / 今日想傾咩呀', () => {
    expect(isTopicMenuAsk('我哋傾咩好呀？')).toBe(true);
    expect(isTopicMenuAsk('今日想傾咩呀？')).toBe(true);
    expect(isTopicMenuAsk('你想傾嗎？')).toBe(true);
    expect(isTopicMenuAsk('Do you want to talk?')).toBe(true);
    expect(scrubTopicMenuAsks('我哋傾咩好呀？ 今日想傾咩呀？')).toBe('');
    expect(capSpokenQuestions('你好。我哋傾咩好呀？ 今日想傾咩呀？', 1)).toBe('你好。');
    expect(capSpokenQuestions('我哋傾咩好呀？ 今日想傾咩呀？', 1)).toBe('');
  });

  it('buildOpenCheerLine has zero questions', () => {
    const line = buildOpenCheerLine('en', {
      nameHello: 'Hi, Sam',
      personaIntro: "I'm here — what should we talk about?",
    });
    expect(countSpokenQuestions(line)).toBe(0);
    expect(openGreetTooManyQuestions(line)).toBe(false);
  });

  it('voiceOpening banks are question-free in every language', () => {
    for (const voice of VOICE_IDS) {
      for (const lang of LANGS) {
        const open = voiceOpening(voice, 'maps', 0, lang, 'Test');
        expect(countSpokenQuestions(open), `${voice}/${lang}`).toBe(0);
      }
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

  it('steady openings are statement-only presence lines', () => {
    const open = voiceOpening('steady', 'maps', 0, 'en', 'Ada');
    expect(open.toLowerCase()).not.toMatch(/on your mind|what are you thinking|quiet thought/);
    expect(open).not.toMatch(/\?/);
    expect(open.toLowerCase()).toMatch(/calm|company|one line/);
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

  it('blocks history-resume asks (continue last time) in any spoken gate mode', () => {
    for (const lang of LANGS) {
      const banned = LAST_THREAD_RESUME_BANNED[lang]!('topic');
      expect(asksToResumeHistory(banned), lang).toBe(true);
      expect(spokenLineLooksBroken(banned, { mode: 'local', lang }), lang).toBe(true);
      expect(spokenLineLooksBroken(banned, { mode: 'idle', lang }), lang).toBe(true);
      expect(gateSpokenLine(banned, { mode: 'idle', lang })?.toLowerCase() ?? '').not.toMatch(/last time|continue|続き|继续|繼續/);
    }
    expect(asksToResumeHistory("It's been a minute... want to pick up where we left off?")).toBe(true);
    expect(asksToResumeHistory('Still here with you in this quiet stretch.')).toBe(false);
  });
});
