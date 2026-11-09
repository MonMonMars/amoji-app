import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { demoPhasePrompt } from '../lib/demo-phase';
import { finishReply } from '../lib/client-chat';
import { BASE_SYSTEM } from '../lib/llm';
import { personalityPrompt } from '../lib/personality';
import { pickShowcaseOffer } from '../lib/showcase';
import {
  SKILL_OFFER_SUPPRESS_MS,
  isAbilityInviteLine,
  isTopicalContentTurn,
  shouldSuppressSkillOffer,
  stripOfftopicAbilityTack,
} from '../lib/skill-offer-guard';

describe('skill-offer guard (no offtopic ability tack-ons)', () => {
  it('flags fun-fact / science / weather / news / story as topical content', () => {
    expect(isTopicalContentTurn(demoPhasePrompt('funFact', 'en'))).toBe(true);
    expect(isTopicalContentTurn('tell me a fun fact')).toBe(true);
    expect(isTopicalContentTurn(demoPhasePrompt('funScience', 'en'))).toBe(true);
    expect(isTopicalContentTurn(demoPhasePrompt('weather', 'en'))).toBe(true);
    expect(isTopicalContentTurn(demoPhasePrompt('news', 'en'))).toBe(true);
    expect(isTopicalContentTurn(demoPhasePrompt('story', 'en'))).toBe(true);
    expect(isTopicalContentTurn('hi')).toBe(false);
    expect(isTopicalContentTurn(demoPhasePrompt('dance', 'en'))).toBe(false);
  });

  it('suppresses skill offers for a window after a topical turn', () => {
    const at = 1_000_000;
    expect(shouldSuppressSkillOffer(at, at + 1_000)).toBe(true);
    expect(shouldSuppressSkillOffer(at, at + SKILL_OFFER_SUPPRESS_MS - 1)).toBe(true);
    expect(shouldSuppressSkillOffer(at, at + SKILL_OFFER_SUPPRESS_MS)).toBe(false);
    expect(shouldSuppressSkillOffer(0, at)).toBe(false);
  });

  it('fun-fact reply: strips a bolted dance invite from the same spoken turn', () => {
    const user = demoPhasePrompt('funFact', 'en');
    const jupiter =
      "Jupiter's Great Red Spot is a storm bigger than Earth. Want to see me dancing?";
    const cleaned = stripOfftopicAbilityTack(jupiter, user);
    expect(cleaned.toLowerCase()).toContain('jupiter');
    expect(cleaned.toLowerCase()).not.toMatch(/danc/);
    expect(isAbilityInviteLine(pickShowcaseOffer('dance', 'en', 0))).toBe(true);
  });

  it('strips sing / music / weather / news / story pitches after fun science', () => {
    const user = demoPhasePrompt('funScience', 'en');
    const cases = [
      ['Water expands when it freezes. Want me to sing a song for you?', /sing|song/i],
      ['Lightning is hotter than the sun surface. Want to listen to some music?', /music|tune/i],
      ['Octopuses have three hearts. Want me to check the weather for you?', /weather/i],
      ['Honey never spoils. Shall I share a bit of good news?', /news|headline/i],
      ['Bananas are berries. Shall I tell you a story?', /story/i],
    ] as const;
    for (const [raw, ban] of cases) {
      const out = stripOfftopicAbilityTack(raw, user);
      expect(out.length, raw).toBeGreaterThan(8);
      expect(out, raw).not.toMatch(ban);
    }
  });

  it('strips ability offers after weather / news / story topical turns', () => {
    expect(
      stripOfftopicAbilityTack(
        'It is 24 degrees and partly cloudy. Want to see me dancing?',
        demoPhasePrompt('weather', 'en'),
      ),
    ).not.toMatch(/danc/i);

    expect(
      stripOfftopicAbilityTack(
        'A local park just opened a new reading nook. Want me to sing a song for you?',
        demoPhasePrompt('news', 'en'),
      ),
    ).not.toMatch(/sing|song/i);

    expect(
      stripOfftopicAbilityTack(
        'Once a fox kept a lantern under the moon. Want to listen to some music?',
        demoPhasePrompt('story', 'en'),
      ),
    ).not.toMatch(/music|tune/i);
  });

  it('keeps soft on-topic check-ins without new activity pitches', () => {
    const out = stripOfftopicAbilityTack(
      'Jupiter has dozens of moons. Want to hear another fun fact?',
      'tell me a fun fact about Jupiter',
    );
    expect(out.toLowerCase()).toContain('jupiter');
    expect(out.toLowerCase()).toMatch(/another|fact|hear/);
  });

  it('does not strip ability lines when the user asked to dance', () => {
    const reply = 'Alright — watch this spin!';
    expect(stripOfftopicAbilityTack(reply, 'dance for me')).toBe(reply);
  });

  it('finishReply post-process applies the guard with lastUser', () => {
    const r = finishReply(
      'Neptune winds are wild. Want to see me dancing?\n[emotion:{"joy":0.6}]',
      { language: 'en', lastUser: 'tell me a fun fact' },
    );
    expect(r.reply.toLowerCase()).toContain('neptune');
    expect(r.reply.toLowerCase()).not.toMatch(/danc/);
  });

  it('ChatPanel mutes showcase offers after topical/demo content turns', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const chat = fs.readFileSync(path.resolve(here, '../components/ChatPanel.tsx'), 'utf8');
    expect(chat).toContain('shouldSuppressSkillOffer');
    expect(chat).toContain('isTopicalContentTurn');
    expect(chat).toContain('stripOfftopicAbilityTack');
    expect(chat).toContain('lastTopicalContentAtRef');
    expect(chat).toMatch(/userHasSpokenRef\.current = true/);
    expect(chat).toMatch(/pendingOfferRef\.current = null/);
  });

  it('prompts forbid offtopic performance offers on factual turns', () => {
    expect(BASE_SYSTEM.toLowerCase()).toMatch(/never bolt on a dance/);
    expect(personalityPrompt('juno').toLowerCase()).toMatch(/never tack on an offer to dance/);
  });
});
