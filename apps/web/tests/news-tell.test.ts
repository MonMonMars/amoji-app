import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  clearLiveCache,
  clearNewsTold,
  gatherLiveContext,
  newsSpokenBodyBeats,
  parseRssItems,
  sayRecent,
  type Headline,
  type Place,
} from '../lib/live-tools';
import { splitChunks } from '../lib/gtts';
import { pickIdleCompanionLine } from '../lib/idle-talk';
import { pickSceneLine } from '../lib/adaptive';
import { factTurnQuietActive, resetFactTurnQuiet } from '../lib/fact-turn-quiet';

// Owner 2026-11-25, verbatim:
//   "the news now still too short, need to tell the news longer, not only tell
//    the title. and it always repeat two times. and then it say something non
//    sense."
// Her transcript: headline / 惠 / headline / 惠, then a poetic flower line.

const TITLE = 'Google AI 計劃有黑色星期五限時特價 月費年費各有優惠';
const SOURCE = 'unwire.hk';
const LEDE = 'Google 宣布旗下人工智能服務喺黑色星期五推出限時優惠，新用戶可以半價試用三個月。';
const DETAIL_1 = '月費計劃由原本一百二十八蚊減到六十四蚊，年費計劃就送多兩個月。';
const DETAIL_2 = '優惠期由星期五開始，一直到下個星期二深夜結束，名額有限。';

const HK: Place = {
  latitude: 22.32, longitude: 114.17, city: 'Hong Kong', region: '', country: 'Hong Kong', source: 'browser',
};

const memKv = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); },
    removeItem: (k: string) => { m.delete(k); },
  };
};

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  resetFactTurnQuiet();
  clearNewsTold(memKv());
  clearLiveCache();
});

describe('news tell: Defect 1 — the story is told, not just the headline', () => {
  it('keeps the lede + detail sentences in the spoken line', () => {
    const lead: Headline = {
      title: TITLE,
      source: SOURCE,
      summary: `${LEDE} ${DETAIL_1} ${DETAIL_2}`,
      details: [LEDE, DETAIL_1, DETAIL_2],
    };
    const line = sayRecent('yue', lead);
    expect(line).toContain(LEDE);
    expect(line).toContain(DETAIL_1);
    expect(line).toContain(DETAIL_2);
    expect(line.length).toBeGreaterThan(TITLE.length + LEDE.length);
    // Several finished statements, not a one-liner title.
    expect(line.split('。').filter((s) => s.trim().length > 0).length).toBeGreaterThanOrEqual(4);
  });

  it('keeps a title-only story verbatim, once, with an attribution sentence', () => {
    const line = sayRecent('yue', { title: TITLE, source: SOURCE });
    // Undated feed → no day claim at all (never 最近, never a false 今日).
    expect(line).toMatch(/^有條新聞：/);
    // A space in a headline can be part of the name — never split it.
    expect(line).toContain(TITLE);
    expect(line.split('月費年費各有優惠').length - 1).toBe(1);
    expect(line).toContain('呢單新聞由unwire報道。');
    expect(line.endsWith('。')).toBe(true);
  });

  it('gathers a Google News description into a full spoken tell', async () => {
    // Google News `<description>` is only `<a>TITLE</a>&nbsp;&nbsp;<font>source</font>`
    // — no lede. The body must come from a second source (Bing News RSS).
    const now = Date.UTC(2026, 10, 26, 4); // 12:00, Thu 26 Nov 2026 in HK
    const pub = new Date(now).toUTCString();
    const rss = `<rss><channel><item><title>${TITLE} - ${SOURCE}</title>`
      + `<description>&lt;a href="https://news.google.com/rss/articles/abc"&gt;${TITLE}&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font color="#6f6f6f"&gt;${SOURCE}&lt;/font&gt;</description>`
      + `<pubDate>${pub}</pubDate></item></channel></rss>`;
    const bingRss = `<rss><channel><item><title>Google AI 訂閱服務推 Black Friday 限時優惠 香港年繳方案大降價 - 科技新聞</title>`
      + '<description>隨著黑色星期五購物季來臨，Google 針對旗下人工智能訂閱服務 Google AI Plus 與 Google AI Pro 推出限時年繳折扣。香港區用戶目前可以用半價訂閱一年。優惠期到十一月三十日結束。</description>'
      + `<pubDate>${pub}</pubDate></item></channel></rss>`;
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('bing.com/news')) return new Response(bingRss, { status: 200 });
      if (url.includes('news.google.com')) return new Response(rss, { status: 200 });
      return jsonRes({}, 404);
    };
    const [row] = parseRssItems(rss);
    expect(row?.title).toBe(TITLE);
    // The <a>Title</a>&nbsp;&nbsp;source spacer must not become a summary.
    expect(row?.summary ?? '').not.toMatch(/nbsp|unwire\.hk/);

    const live = await gatherLiveContext('今日有咩新聞？', {
      lang: 'yue',
      fetch: fetchImpl,
      cache: new Map(),
      storage: memKv(),
      locate: async () => HK,
      now,
    });
    // Dated today → say today, never 最近.
    expect(live.spoken).toMatch(/^今日有條新聞：/);
    expect(live.spoken).not.toMatch(/最近/);
    // Headline once, then real detail from the second source.
    expect(live.spoken.split('月費年費各有優惠').length - 1).toBe(1);
    expect(live.spoken).toContain('限時年繳折扣');
    expect(live.spoken).toContain('半價訂閱一年');
    expect(live.spoken.split('。').filter((s) => s.trim().length > 0).length).toBeGreaterThanOrEqual(3);
    expect(live.spoken).not.toMatch(/nbsp/i);
  });
});

describe('news tell: Defect 2 — headline spoken once, never a dangling character', () => {
  it('never repeats the headline inside the body beats', () => {
    // The old failure: the summary/description repeated the headline text, and
    // the detail beat was the whole summary-with-headline, so the title was
    // spoken twice in one turn.
    const lead: Headline = {
      title: TITLE,
      source: SOURCE,
      summary: `${TITLE} 　${TITLE}　${DETAIL_1} ${TITLE}`,
      details: [`${TITLE} ${DETAIL_1}`, TITLE],
    };
    const beats = newsSpokenBodyBeats(lead, 'yue');
    expect(beats.some((b) => b.includes(TITLE))).toBe(false);
    expect(beats.join('')).toContain(DETAIL_1);
  });

  it('says the headline exactly once even when the feed duplicates it', () => {
    const lead: Headline = {
      title: TITLE,
      source: SOURCE,
      summary: `${TITLE} ${TITLE} ${TITLE} ${LEDE}`,
      details: [TITLE, `${TITLE} ${LEDE}`, LEDE],
    };
    const line = sayRecent('yue', lead);
    const occurrences = line.split('月費年費各有優惠').length - 1;
    expect(occurrences).toBe(1);
    expect(line.split('限時特價').length - 1).toBe(1);
    expect(line).toContain(LEDE);
  });

  it('never emits a one-character sentence (the owner heard a lone 惠)', () => {
    // 121 CJK chars with no punctuation is exactly the shape that used to leave
    // a 1-char tail after the 120-unit hard wrap.
    const lead: Headline = {
      title: TITLE,
      source: '',
      summary: '惠'.repeat(121),
    };
    const line = sayRecent('yue', lead);
    const sentences = line.split(/(?<=[。！？])/u).map((s) => s.replace(/[。！？]/gu, '').trim()).filter(Boolean);
    for (const s of sentences) {
      expect(Array.from(s).length).toBeGreaterThanOrEqual(3);
    }
    const tail = splitChunks(line).at(-1) ?? '';
    expect(Array.from(tail.replace(/[。！？]/gu, '')).length).toBeGreaterThan(2);
  });

  it('splitChunks never leaves a 1–2 unit chunk or splits a surrogate pair', () => {
    const chunks = splitChunks('惠'.repeat(121));
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe('惠'.repeat(121));
    // Astral char straddling the 120th code unit stays whole.
    const emoji = `${'a'.repeat(119)}😀${'b'.repeat(10)}`;
    for (const c of splitChunks(emoji)) {
      expect(c.includes('\ud83d') && !c.includes('\ude00')).toBe(false);
    }
  });
});

describe('news tell: Defect 3 — no poetic filler after a fact turn', () => {
  it('a news tell quiets idle companion + scene chatter', () => {
    const lead: Headline = { title: TITLE, source: SOURCE, summary: `${LEDE} ${DETAIL_1}` };
    const line = sayRecent('yue', lead);
    expect(line).not.toMatch(/收埋|一朵新鮮嘅花|放近啲/);
    expect(factTurnQuietActive()).toBe(true);
    // The exact bank line the owner heard ("shy" / garden motif) cannot fire.
    expect(pickIdleCompanionLine('shy', 'female', 'yue', 7)).toBe('');
    expect(pickSceneLine('meadow', 'yue', 1)).toBeUndefined();
  });

  it('idle chatter returns once the fact window has passed', () => {
    expect(pickIdleCompanionLine('shy', 'female', 'yue', 7)).not.toBe('');
    expect(pickSceneLine('meadow', 'yue', 1)).toBeTruthy();
    sayRecent('yue', { title: TITLE, source: SOURCE });
    expect(factTurnQuietActive()).toBe(true);
  });
});

describe('news tell: one speak request per turn', () => {
  const panel = readFileSync(join(__dirname, '../components/ChatPanel.tsx'), 'utf8');

  it('the facts-only branch speaks the live line once and skips the LLM lanes', () => {
    const block = panel.slice(
      panel.indexOf('isLiveFactsOnlyTurn(livePlan, worldSpoken)'),
      panel.indexOf('// r97'),
    );
    expect(block).toContain('scrubLiveFactsSpoken');
    expect(block.match(/\bspeak\(/g)?.length).toBe(1);
    expect(block).toContain('answered = true');
    expect(panel).toContain('if (!answered) {');
  });

  it('idle chatter is gated while a fact turn is fresh', () => {
    expect(panel).toContain('factTurnQuietActive()');
    const idleLoop = panel.slice(
      panel.indexOf('const timer = setInterval'),
      panel.indexOf('}, 5000);'),
    );
    expect(idleLoop).toContain('factTurnQuietActive()');
  });
});
