import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  NEWS_SPOKEN_MIN_BODY_SENTENCES,
  clearLiveCache,
  clearNewsTold,
  gatherLiveContext,
  newsSpokenBodyBeats,
  newsTellNeedsEnrichment,
  normalizeNewsTitle,
  parseRssItems,
  sayRecent,
  sayNews,
  type Headline,
  type Place,
} from '../lib/live-tools';
import { splitChunks } from '../lib/gtts';
import { pickIdleCompanionLine } from '../lib/idle-talk';
import { pickSceneLine } from '../lib/adaptive';
import {
  FACT_LINE_REPEAT_WINDOW_MS,
  claimFactLineOnce,
  factTurnQuietActive,
  resetFactLineOnce,
  resetFactTurnQuiet,
} from '../lib/fact-turn-quiet';
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
  resetFactLineOnce();
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

// ─────────────────────────────────────────────────────────────────────────────
// Owner 2026-11-26, THIRD report of the same class:
//   "the news still too short and repeated one time again"
// PR #593 claimed to fix exactly this and did not hold. These tests lock the
// real behaviours: several sentences of real body, and one dispatch per turn.
// ─────────────────────────────────────────────────────────────────────────────

const WEATHER_TITLE = '天文台：周五多雲有幾陣雨 氣溫最低十六度';
const WEATHER_SOURCE = 'RTHK News';
const WEATHER_BODY = [
  '天文台表示，一股東北季候風會在周五抵達廣東沿岸，本港天氣會轉為多雲。',
  '周五氣溫會由最高的二十二度，逐步降至最低的十六度左右。',
  '預測周五有幾陣雨，市民出門最好帶備雨具。',
  '周末期間風勢仍然偏大，海面會有湧浪，水上活動要注意安全。',
  '天文台呼籲長者及長期病患者注意保暖，並留意最新天氣預報。',
];

const sentenceCount = (line: string): number =>
  line.split(/(?<=[。！？!?])/u).filter((s) => s.trim().length > 2).length;

/** Escape a fragment the way an RSS `<description>` carries HTML. */
const rssEscape = (html: string): string =>
  html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

describe('news tell: several real body sentences (Defect 1, third report)', () => {
  it('reads five story sentences — a concrete minimum length, not a headline', () => {
    const lead: Headline = {
      title: WEATHER_TITLE,
      source: WEATHER_SOURCE,
      summary: WEATHER_BODY.join(''),
      details: WEATHER_BODY,
    };
    const line = sayRecent('yue', lead);
    // Body only, excluding the intro + headline sentence.
    const bodyChars = line.length - `有條新聞：${WEATHER_TITLE}。`.length;
    expect(bodyChars).toBeGreaterThan(120);
    expect(line.length).toBeGreaterThan(150);
    expect(sentenceCount(line)).toBeGreaterThanOrEqual(5);
    for (const s of WEATHER_BODY) expect(line).toContain(s);
  });

  it('treats a two-sentence / one-line body as too short and seeks enrichment', () => {
    // This is the shape that used to pass NEWS_SPOKEN_MIN_BODY_CHARS = 56, so
    // the enrichment branch never fired and the tell stayed short.
    const thin: Headline = {
      title: WEATHER_TITLE,
      source: WEATHER_SOURCE,
      summary: '天文台表示周五多雲有雨。氣溫會降至十六度。',
    };
    expect(newsTellNeedsEnrichment(thin, 'yue')).toBe(true);
    expect(NEWS_SPOKEN_MIN_BODY_SENTENCES).toBeGreaterThanOrEqual(2);
    const rich: Headline = {
      title: WEATHER_TITLE,
      source: WEATHER_SOURCE,
      summary: WEATHER_BODY.join(''),
      details: WEATHER_BODY,
    };
    expect(newsTellNeedsEnrichment(rich, 'yue')).toBe(false);
  });

  it('keeps the full multi-sentence body instead of a 4-chunk slice', () => {
    const beats = newsSpokenBodyBeats({
      title: WEATHER_TITLE,
      source: WEATHER_SOURCE,
      summary: WEATHER_BODY.join(''),
      details: WEATHER_BODY,
    }, 'yue');
    expect(beats.length).toBeGreaterThanOrEqual(5);
    expect(beats.join('')).toContain(WEATHER_BODY[4]!);
  });

  it('never speaks Google’s related-headline cluster as the story body', () => {
    // Google News ships `<ol><li><a>headline</a> source</li>…` — a list of
    // OTHER outlets' headlines about the same event. Flattened into prose it
    // read as "the same news three times" plus nonsense.
    const cluster = '<ol>'
      + `<li><a href="https://news.google.com/rss/articles/a">${WEATHER_TITLE}</a>&nbsp;&nbsp;<font color="#6f6f6f">RTHK News</font></li>`
      + '<li><a href="https://news.google.com/rss/articles/b">同一天氣新聞 另一間報館的標題寫法</a>&nbsp;&nbsp;<font color="#6f6f6f">明報新聞網</font></li>'
      + '<li><a href="https://news.google.com/rss/articles/c">天氣｜周五有雨 市民記得帶傘</a>&nbsp;&nbsp;<font color="#6f6f6f">香港01</font></li>'
      + '</ol>';
    const rss = `<rss><channel><item><title>${WEATHER_TITLE} - ${WEATHER_SOURCE}</title>`
      + `<description>${rssEscape(cluster)}</description></item></channel></rss>`;
    const [row] = parseRssItems(rss);
    expect(row?.title).toBe(WEATHER_TITLE);
    expect(row?.summary ?? '').toBe('');
    const line = sayRecent('yue', row!);
    expect(line).not.toContain('另一間報館');
    expect(line).not.toContain('市民記得帶傘');
  });

  it('keeps a real prose lede that sits beside a related-link list', () => {
    const html = `<p>天文台表示，一股東北季候風會在周五抵達廣東沿岸，本港天氣會轉為多雲。</p>${rssEscape('<ol><li><a>別家標題</a></li></ol>')}`;
    const rss = `<rss><channel><item><title>${WEATHER_TITLE} - ${WEATHER_SOURCE}</title>`
      + `<description>${rssEscape(html)}</description></item></channel></rss>`;
    const [row] = parseRssItems(rss);
    expect(row?.summary ?? '').toContain('東北季候風');
    expect(row?.summary ?? '').not.toContain('別家標題');
  });
});

describe('news tell: one dispatch per fact turn (Defect 2, structural)', () => {
  it('the same story is spoken exactly ONCE across every dispatch path', () => {
    const lead: Headline = {
      title: WEATHER_TITLE,
      source: WEATHER_SOURCE,
      summary: WEATHER_BODY.join(''),
      details: WEATHER_BODY,
    };
    const line = sayRecent('yue', lead);
    const key = normalizeNewsTitle(lead.title);
    // This is the production guard used by ChatPanel: news branch, news chip
    // and showcase offer all claim the story key before they speak.
    const dispatched: string[] = [];
    const dispatch = (claimKey: string, text: string) => {
      if (claimFactLineOnce(claimKey)) dispatched.push(text);
    };

    dispatch(key, line);                                         // facts branch
    dispatch(key, line);                                         // re-render / second path
    dispatch(key, sayNews('yue', 'Hong Kong', lead));            // warm near-me framing
    dispatch(normalizeNewsTitle(lead.title), line);              // chip path, same story

    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]).toBe(line);
    // The spoken line itself names the story once.
    expect(line.split('周五多雲有幾陣雨').length - 1).toBe(1);

    // A genuinely different story is not blocked.
    dispatch('另一單新聞的標題', '有條新聞：另一單新聞的標題。');
    expect(dispatched).toHaveLength(2);
  });

  it('the guard expires, so a later ask can tell the story again', () => {
    const key = 'same story key';
    const t0 = 1_000_000;
    expect(claimFactLineOnce(key, t0)).toBe(true);
    expect(claimFactLineOnce(key, t0 + 1000)).toBe(false);
    expect(claimFactLineOnce(key, t0 + FACT_LINE_REPEAT_WINDOW_MS + 1)).toBe(true);
  });

  it('an empty line never claims, and never blocks the next tell', () => {
    expect(claimFactLineOnce('')).toBe(false);
    expect(claimFactLineOnce('   ')).toBe(false);
    expect(claimFactLineOnce('有條新聞：天文台預測周五有雨。')).toBe(true);
  });

  it('ChatPanel claims before speaking on every news dispatch site', () => {
    const panel = readFileSync(join(__dirname, '../components/ChatPanel.tsx'), 'utf8');
    const claims = panel.match(/claimFactLineOnce\(/g) ?? [];
    // facts-only branch, showcase chip, LLM lane (streamed + server), story key.
    expect(claims.length).toBeGreaterThanOrEqual(3);
    // Both LLM lanes go through the shared claim helper before speakReply.
    const laneGuards = panel.match(/if \(!claimLiveStory\(\)\) return;/g) ?? [];
    expect(laneGuards.length).toBeGreaterThanOrEqual(2);
    // Keyed on the story, not just the rendered line, so a reformatted day
    // intro cannot slip a second read through.
    expect(panel).toContain('worldNewsKey');
    expect(panel).toContain('live.newsKey');
  });

  it('a news tell still marks the fact window (quiet chatter survives)', () => {
    const lead: Headline = { title: WEATHER_TITLE, source: WEATHER_SOURCE, summary: WEATHER_BODY.join('') };
    sayRecent('yue', lead);
    expect(factTurnQuietActive()).toBe(true);
  });
});

