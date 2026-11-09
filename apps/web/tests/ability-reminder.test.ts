import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SHOWCASE_OFFERS, SKILL_OFFERS, nextSkillOffer } from '../lib/showcase';

describe('ability reminders (one skill at a time)', () => {
  it('covers music, dance, song, weather, story, news', () => {
    for (const kind of ['music', 'dance', 'song', 'weather', 'story', 'news'] as const) {
      expect(SKILL_OFFERS).toContain(kind);
      expect(SHOWCASE_OFFERS.en[kind][0]!.toLowerCase()).toMatch(
        /want|shall|music|danc|sing|weather|story|news|headline|tune/,
      );
    }
  });

  it('never repeats the same ability back-to-back', () => {
    const seen: string[] = [];
    let last: ReturnType<typeof nextSkillOffer> | null = null;
    for (let n = 0; n < 24; n++) {
      const kind = nextSkillOffer(n, last);
      if (last) expect(kind).not.toBe(last);
      seen.push(kind);
      last = kind;
    }
    expect(new Set(seen).size).toBeGreaterThanOrEqual(5);
  });

  it('ChatPanel offers one ability on open brief and long idle', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const chat = fs.readFileSync(path.resolve(here, '../components/ChatPanel.tsx'), 'utf8');
    expect(chat).toContain('nextSkillOffer');
    expect(chat).toContain('pickShowcaseOffer');
    expect(chat).toContain('showcaseStoryAsk');
    // No multi-topic dump on the idle ability path
    expect(chat).toMatch(/One ability at a time when quiet/);
  });
});
