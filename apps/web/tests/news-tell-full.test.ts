import { describe, expect, it } from 'vitest';
import {
  newsBodyMatchScore,
  newsDayDescriptor,
  newsDayLabel,
  sayRecent,
  type Headline,
} from '../lib/live-tools';

// Owner 2026-11-26, verbatim:
//   "the news still too short, and secondly, say the day of the news rather
//    than say 最近, I prefer read today news … and read the detail of the news"
const TITLE = 'Google AI 計劃有黑色星期五限時特價 月費年費各有優惠';
const SOURCE = 'unwire.hk';

/** 12:00, Thursday 26 November 2026 in Hong Kong. */
const NOW = Date.UTC(2026, 10, 26, 4);
const DAY = 86_400_000;

describe('news day: Requirement A — say the real day, never 最近', () => {
  it('today / yesterday / the day before yesterday use real day words', () => {
    const at = (daysAgo: number) => NOW - daysAgo * DAY;
    expect(newsDayDescriptor(at(0), NOW)?.kind).toBe('today');
    expect(newsDayDescriptor(at(1), NOW)?.kind).toBe('yesterday');
    expect(newsDayDescriptor(at(2), NOW)?.kind).toBe('twoDaysAgo');
  });

  it('names the weekday for 3–6 days and the plain date from a week on', () => {
    // Thu 26 Nov 2026 → 4 days earlier is Sunday 22 Nov.
    expect(newsDayLabel('yue', newsDayDescriptor(NOW - 4 * DAY, NOW))).toBe('禮拜日');
    expect(newsDayLabel('zh', newsDayDescriptor(NOW - 4 * DAY, NOW))).toBe('星期日');
    expect(newsDayLabel('ja', newsDayDescriptor(NOW - 4 * DAY, NOW))).toBe('日曜日');
    expect(newsDayLabel('en', newsDayDescriptor(NOW - 4 * DAY, NOW))).toBe('Sunday');
    // 9 days earlier is Monday 17 Nov — older than the 7-day cutoff → date.
    expect(newsDayLabel('yue', newsDayDescriptor(NOW - 9 * DAY, NOW))).toBe('11月17號');
    expect(newsDayLabel('zh', newsDayDescriptor(NOW - 9 * DAY, NOW))).toBe('11月17日');
    expect(newsDayLabel('ja', newsDayDescriptor(NOW - 9 * DAY, NOW))).toBe('11月17日');
    expect(newsDayLabel('en', newsDayDescriptor(NOW - 9 * DAY, NOW))).toBe('17 November');
  });

  it('says today in all four locales, with genuine translations', () => {
    const lead = { title: TITLE, source: SOURCE, publishedAt: NOW - 3 * 3_600_000 };
    expect(sayRecent('yue', lead, NOW)).toMatch(/^今日有條新聞：/);
    expect(sayRecent('zh', lead, NOW)).toMatch(/^今天有条新闻：/);
    expect(sayRecent('ja', lead, NOW)).toMatch(/^今日のニュースは、/);
    expect(sayRecent('en', lead, NOW)).toMatch(/^From today's news:/);
  });

  it('says yesterday in all four locales and never 最近 / recently', () => {
    const lead = { title: TITLE, source: SOURCE, publishedAt: NOW - DAY };
    const yue = sayRecent('yue', lead, NOW);
    const zh = sayRecent('zh', lead, NOW);
    const ja = sayRecent('ja', lead, NOW);
    const en = sayRecent('en', lead, NOW);
    expect(yue).toMatch(/^琴日有條新聞：/);
    expect(zh).toMatch(/^昨天有条新闻：/);
    expect(ja).toMatch(/^昨日のニュースは、/);
    expect(en).toMatch(/^From yesterday's news:/);
    for (const line of [yue, zh, ja, en]) expect(line).not.toMatch(/最近|recently/i);
    // String-table hygiene: no English copy leaking into the CJK columns.
    for (const line of [yue, zh, ja]) expect(line).not.toMatch(/recently|news:/i);
  });

  it('never invents a day when the feed gave no publishedAt', () => {
    const lead: Headline = { title: TITLE, source: SOURCE };
    const yue = sayRecent('yue', lead, NOW);
    expect(yue).toMatch(/^有條新聞：/);
    expect(yue).not.toMatch(/最近|今日|琴日|前日/);
    expect(sayRecent('zh', lead, NOW)).toMatch(/^有条新闻：/);
    expect(sayRecent('ja', lead, NOW)).toMatch(/^ニュースだよ、/);
    expect(sayRecent('en', lead, NOW)).toMatch(/^From the news:/);
  });
});

describe('news detail: Requirement B — body, not just the title', () => {
  const LEDE = '隨著黑色星期五購物季來臨，Google 針對旗下人工智能訂閱服務推出限時年繳折扣。';
  const DETAIL = '香港區用戶目前可以用半價訂閱一年，優惠期到十一月三十日結束。';
  const MORE = '原有的月費用戶亦可以升級年費計劃，毋須重新登記。';

  it('a title-only Google News row is one line; a body-enriched row is several', () => {
    const before = sayRecent('yue', { title: TITLE, source: SOURCE, publishedAt: NOW - 3_600_000 }, NOW);
    const after = sayRecent('yue', {
      title: TITLE,
      source: SOURCE,
      publishedAt: NOW - 3_600_000,
      summary: `${LEDE}${DETAIL}${MORE}`,
      details: [LEDE, DETAIL, MORE],
    }, NOW);
    // eslint-disable-next-line no-console
    console.log('BEFORE:', before);
    // eslint-disable-next-line no-console
    console.log('AFTER:', after);
    expect(after.length).toBeGreaterThan(before.length + 40);
    expect(after).toContain('限時年繳折扣');
    expect(after).toContain('半價訂閱一年');
    expect(after).toContain('升級年費計劃');
    expect(after.split('。').filter((s) => s.trim().length > 0).length).toBeGreaterThanOrEqual(4);
  });

  it('only borrows a second-source body from the same story', () => {
    // Bing News RSS hit for the same Google AI Black Friday deal.
    const same = newsBodyMatchScore(
      TITLE,
      'Google AI 訂閱服務推 Black Friday 限時優惠 香港、台灣年繳方案大降價 隨著黑色星期五購物季來臨，Google 推出限時年繳折扣。',
    );
    expect(same).toBeGreaterThanOrEqual(0.5);
    // A different company's Black Friday deal must not be attached.
    expect(newsBodyMatchScore(TITLE, 'Grok Bot Black Friday 優惠 買一個月送一個月 X 推出 Premium 限時優惠。')).toBe(0);
    expect(newsBodyMatchScore(TITLE, 'CAPCOM BLACK FRIDAY SALE 舉辦中 PlayStation Store 遊戲優惠。')).toBe(0);
  });
});
