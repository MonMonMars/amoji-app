import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CRISIS_HELPLINES,
  HELPLINES_BY_REGION,
  crisisReplyText,
  detectCrisis,
  guardCompanionTurn,
  helplineLine,
  helplinesForRegion,
} from '../lib/crisis';
import { LANGS } from '../lib/prefs';

const HK_NUMBERS = HELPLINES_BY_REGION.HK.map((h) => h.tel);
const CATALOGUE_NUMBERS = CRISIS_HELPLINES.map((h) => h.tel);

describe('crisis detection — Cantonese colloquial', () => {
  const PHRASES = [
    '我真係好想死',
    '唔想活落去喇',
    '不如自殺算啦',
    '死咗佢就算',
    '我覺得完全冇意思',
    '我撐唔住喇',
    '我頂唔住喇',
    '我想𠝹手',
    '我想輕生',
    '我想消失',
    '冇咗我會好啲',
  ];
  for (const phrase of PHRASES) {
    it(`flags "${phrase}"`, () => {
      expect(detectCrisis(phrase)).toBe(true);
    });
  }
});

describe('crisis detection — standard Chinese (both scripts)', () => {
  const PHRASES = [
    '我想自杀',
    '我真的不想活了',
    '我觉得生活没有意义',
    '我撑不下去了',
    '我想自残',
    '我准备跳楼',
    '我想结束自己的生命',
    '我宁愿死',
    '我已经无路可走',
  ];
  for (const phrase of PHRASES) {
    it(`flags "${phrase}"`, () => {
      expect(detectCrisis(phrase)).toBe(true);
    });
  }
});

describe('crisis detection — English', () => {
  const PHRASES = [
    'I want to kill myself',
    'I have been thinking about suicide',
    'I want to die',
    'I wish I was dead',
    'everyone would be better off dead',
    'I do not want to live anymore',
    "there's no point in living",
    'I have nothing to live for',
    'I keep cutting myself',
    'I took an overdose last night',
    'I want to end my own life',
    'I am going to end it all',
    'I want to self-harm',
    'I cannot go on living',
  ];
  for (const phrase of PHRASES) {
    it(`flags "${phrase}"`, () => {
      expect(detectCrisis(phrase)).toBe(true);
    });
  }
});

describe('crisis detection — benign messages are NOT caught', () => {
  const BENIGN = [
    // ordinary speech that contains 死 / die but is not a crisis
    '笑死我喇',
    '今日攰死',
    '熱死喇今日',
    '呢套戲悶到死',
    'I could die of embarrassment',
    'this exam will kill me',
    'I am dying to see that movie',
    '累死了',
    '我今日好開心',
    '你想食咩呀？',
    'tell me a joke',
    'what is the weather like today?',
    'kill time by reading a book',
    'the plant died',
    'that movie was deadly boring',
    '你好嗎',
    '今朝跑步跑咗五公里',
    '',
    '   ',
  ];
  for (const phrase of BENIGN) {
    it(`leaves "${phrase}" alone`, () => {
      expect(detectCrisis(phrase)).toBe(false);
    });
  }
});

describe('known, accepted false positives (documented, not accidental)', () => {
  // These fire the guard even though the speaker may not be in danger. That is
  // a deliberate trade: one caring reply with phone numbers costs little, a
  // missed crisis costs everything. Recorded here so nobody "fixes" it later
  // without understanding why it is there.
  const ACCEPTED_FALSE_POSITIVES = [
    '呢套戲冇意思，唔想睇',
    '我想消失幾日，去個旅行',
    '今日真係撐唔住，好攰',
  ];
  for (const phrase of ACCEPTED_FALSE_POSITIVES) {
    it(`fires on "${phrase}" — accepted, and the reply is still safe`, () => {
      expect(detectCrisis(phrase)).toBe(true);
      expect(crisisReplyText('yue')).toContain('2389 2222'); // yue → HK
    });
  }
});

describe('crisis detection — Japanese surface', () => {
  it('flags 死にたい and 消えたい', () => {
    expect(detectCrisis('もう死にたい')).toBe(true);
    expect(detectCrisis('消えたい')).toBe(true);
  });
  it('does not flag ordinary Japanese', () => {
    expect(detectCrisis('今日は楽しかった')).toBe(false);
  });
});

describe('fixed crisis reply', () => {
  it('names the language-fallback region helplines in every language', () => {
    // Without geo hints, lang picks the region (yue→HK, zh→CN, ja→JP, en→US).
    const expectByLang: Record<string, string[]> = {
      yue: HK_NUMBERS,
      zh: HELPLINES_BY_REGION.CN.map((h) => h.tel),
      ja: HELPLINES_BY_REGION.JP.map((h) => h.tel),
      en: HELPLINES_BY_REGION.US.map((h) => h.tel),
    };
    for (const { id } of LANGS) {
      const text = crisisReplyText(id);
      for (const tel of expectByLang[id]!) expect(text).toContain(tel);
    }
  });

  it('states plainly that it is not a crisis service, in every language', () => {
    const NOT_A_SERVICE: Record<string, RegExp> = {
      en: /not a crisis service/i,
      yue: /唔係危機支援服務/,
      zh: /不是危机干预服务/,
      ja: /危機対応の窓口じゃない/,
    };
    for (const { id } of LANGS) {
      expect(crisisReplyText(id)).toMatch(NOT_A_SERVICE[id]!);
    }
  });

  it('is localized — no language returns the English string as-is', () => {
    const en = crisisReplyText('en');
    for (const id of ['yue', 'zh', 'ja'] as const) {
      expect(crisisReplyText(id)).not.toBe(en);
    }
    // and each CJK variant is distinct from the others
    expect(crisisReplyText('yue')).not.toBe(crisisReplyText('zh'));
    expect(crisisReplyText('zh')).not.toBe(crisisReplyText('ja'));
  });

  it('never asks the person a follow-up question', () => {
    for (const { id } of LANGS) {
      expect(crisisReplyText(id)).not.toMatch(/[?？]/);
    }
  });

  it('falls back to Cantonese for an unknown language', () => {
    expect(crisisReplyText('klingon')).toBe(crisisReplyText('yue'));
  });
});

describe('guardCompanionTurn', () => {
  it('blocks the turn and returns the fixed reply', () => {
    const g = guardCompanionTurn('我想死', 'yue');
    expect(g.blocked).toBe(true);
    expect(g.reply).toBe(crisisReplyText('yue'));
  });

  it('lets a benign message through with an empty reply', () => {
    const g = guardCompanionTurn('今日天氣好好', 'yue');
    expect(g.blocked).toBe(false);
    expect(g.reply).toBe('');
  });
});

describe('helpline data', () => {
  it('carries the required lines with dialable numbers in the catalogue', () => {
    const expected = [
      ['Samaritan Befrienders Hong Kong', '2389 2222'],
      ['Suicide Prevention Services', '2382 0000'],
      ['The Samaritans HK', '2896 0000'],
      ['US 988 Suicide & Crisis Lifeline', '988'],
      ['Japan Inochi no Denwa', '0120-783-556'],
    ];
    for (const [name, tel] of expected) {
      expect(CRISIS_HELPLINES).toContainEqual(expect.objectContaining({ name, tel }));
    }
  });

  it('joins names and numbers into one readable line for a region', () => {
    const line = helplineLine('HK');
    for (const tel of HK_NUMBERS) expect(line).toContain(tel);
    expect(helplinesForRegion('US').map((h) => h.tel)).toContain('988');
    expect(CATALOGUE_NUMBERS.length).toBeGreaterThan(HK_NUMBERS.length);
  });
});

describe('crisis guard skips the model entirely', () => {
  it('client-chat is never reached when the guard fires', async () => {
    const chatSpy = vi.fn();
    vi.doMock('../lib/client-chat', () => ({ clientChat: chatSpy }));

    // The guard is what ChatPanel/route/face call first; the assertion that
    // matters is that the guarded branch cannot reach a transport.
    const { guardCompanionTurn: guard } = await import('../lib/crisis');
    const g = guard('I want to kill myself', 'en');
    expect(g.blocked).toBe(true);
    expect(chatSpy).not.toHaveBeenCalled();

    vi.doUnmock('../lib/client-chat');
  });

  it('ChatPanel calls the guard before any brain work', () => {
    // Behavioural ordering check on the source: the guard must sit above the
    // first clientChat / live-context call in send().
    const src = readFileSync(join(__dirname, '../components/ChatPanel.tsx'), 'utf8');
    const sendAt = src.indexOf('const send = async (');
    expect(sendAt).toBeGreaterThan(-1);
    const body = src.slice(sendAt);
    const guardAt = body.indexOf('guardCompanionTurn(text, lang');
    const liveAt = body.indexOf('clientLiveContext(text');
    const chatAt = body.indexOf('clientChat([...history');
    expect(guardAt).toBeGreaterThan(-1);
    expect(liveAt).toBeGreaterThan(-1);
    expect(chatAt).toBeGreaterThan(-1);
    expect(guardAt).toBeLessThan(liveAt);
    expect(guardAt).toBeLessThan(chatAt);
  });
});
