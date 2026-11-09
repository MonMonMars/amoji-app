import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { demoPhasePrompt } from '../lib/demo-phase';
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

describe('skill-offer guard (no offtopic dance tack-ons)', () => {
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

  it('does not strip ability lines when the user asked to dance', () => {
    const reply = 'Alright — watch this spin!';
    expect(stripOfftopicAbilityTack(reply, 'dance for me')).toBe(reply);
  });

  it('ChatPanel mutes showcase offers after topical/demo content turns', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const chat = fs.readFileSync(path.resolve(here, '../components/ChatPanel.tsx'), 'utf8');
    expect(chat).toContain('shouldSuppressSkillOffer');
    expect(chat).toContain('isTopicalContentTurn');
    expect(chat).toContain('stripOfftopicAbilityTack');
    expect(chat).toContain('lastTopicalContentAtRef');
    expect(chat).toMatch(/userHasSpokenRef\.current = true/);
  });

  it('prompts forbid offtopic performance offers on factual turns', () => {
    expect(BASE_SYSTEM.toLowerCase()).toMatch(/never bolt a second topic or ability invite/);
    expect(BASE_SYSTEM.toLowerCase()).toMatch(/multi-beat exception/);
    expect(personalityPrompt('juno').toLowerCase()).toMatch(/never bolt dance/);
    expect(personalityPrompt('juno').toLowerCase()).toMatch(/keyed byok/);
  });

  it('does not import use-client demo-phase (breaks Next /api/chat collect)', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const src = fs.readFileSync(path.resolve(here, '../lib/skill-offer-guard.ts'), 'utf8');
    expect(src).not.toMatch(/from ['"]\.\/demo-phase['"]/);
    expect(src).not.toMatch(/from ['"]\.\/topic-suggestions['"]/);
  });
});
