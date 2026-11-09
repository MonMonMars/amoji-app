import { describe, expect, it } from 'vitest';
import {
  SHOWCASE_OFFERS, SHOWCASE_START, SHOWCASE_YES_RE, SKILL_OFFERS, TUTORIAL_LINES,
  characterSpecialty, nextSkillOffer, pickShowcaseOffer, pickTutorialLine,
  showcaseStoryAsk, skillOfferKind,
} from '../lib/showcase';

const LANGS = ['yue', 'zh', 'ja', 'en'] as const;
const KINDS = ['dance', 'song', 'music', 'weather', 'news', 'story'] as const;

describe('showcase + tutorial dialogue (r2026-10-04.48)', () => {
  it('rotates one ability at a time across the full skill set', () => {
    expect(SKILL_OFFERS).toEqual(expect.arrayContaining([...KINDS]));
    expect(new Set(SKILL_OFFERS).size).toBe(SKILL_OFFERS.length);
    expect(skillOfferKind(0)).toBe(SKILL_OFFERS[0]);
    expect(nextSkillOffer(0, SKILL_OFFERS[0])).not.toBe(SKILL_OFFERS[0]);
  });

  it('every language has invite-style offers per kind, each ending on a hook', () => {
    for (const lang of LANGS) {
      for (const kind of KINDS) {
        const bank = SHOWCASE_OFFERS[lang][kind];
        expect(bank.length, `${lang}/${kind}`).toBeGreaterThanOrEqual(2);
        for (const line of bank) expect(line).toMatch(/[?？~～!！]$/);
      }
    }
  });

  it('show-start one-liners exist in every language for every kind', () => {
    for (const lang of LANGS) {
      for (const kind of KINDS) {
        expect(SHOWCASE_START[lang][kind].length).toBeGreaterThan(0);
      }
    }
    expect(showcaseStoryAsk('en')).toMatch(/story/i);
  });

  it('tutorial bank covers the feature set in every language', () => {
    for (const lang of LANGS) {
      expect(TUTORIAL_LINES[lang].length).toBeGreaterThanOrEqual(6);
    }
    const all = TUTORIAL_LINES.en.join(' ').toLowerCase();
    for (const kw of ['sing', 'dance', 'game', 'yoga', 'meal', 'mic', 'remember']) {
      expect(all).toContain(kw);
    }
  });

  it('YES answers start the show; refusals and unrelated lines do not', () => {
    for (const yes of ['好呀', '想聽', '想看', 'yes please', 'sure', 'はい', '聞きたい', 'okay']) {
      expect(SHOWCASE_YES_RE.test(yes), yes).toBe(true);
    }
    for (const no of ['唔好', '不要', '不用', 'no', 'いいえ', '算了', '我要走了', '今天天氣不錯']) {
      expect(SHOWCASE_YES_RE.test(no), no).toBe(false);
    }
  });

  it('specialty is valid and deterministic for any character', () => {
    expect(characterSpecialty('marin')).toBe('dance');
    expect(characterSpecialty('mika')).toBe('song');
    expect(KINDS).toContain(characterSpecialty('whoever'));
  });

  it('picks rotate deterministically through the banks', () => {
    expect(pickShowcaseOffer('dance', 'yue', 0)).toBe(SHOWCASE_OFFERS.yue.dance[0]);
    expect(pickShowcaseOffer('dance', 'yue', 3)).toBe(SHOWCASE_OFFERS.yue.dance[0]);
    expect(pickTutorialLine('en', 2)).toBe(TUTORIAL_LINES.en[2]);
    expect(pickTutorialLine('en', 10)).toBe(TUTORIAL_LINES.en[2]);
  });
});
