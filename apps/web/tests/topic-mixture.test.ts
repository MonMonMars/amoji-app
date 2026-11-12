import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BASE_SYSTEM } from '../lib/llm';
import { personalityPrompt } from '../lib/personality';
import {
  allowsRichTopicMixture,
  detectAbilityOfferKind,
  detectUserAbilityTopics,
  mustStayOneTopic,
  stripOffTopicAbilityTacks,
} from '../lib/topic-mixture';
import { isTopicalContentTurn, shouldSuppressSkillOffer, SKILL_OFFER_SUPPRESS_MS } from '../lib/skill-offer-guard';
import { demoPhasePrompt } from '../lib/demo-phase';
import { pickShowcaseOffer } from '../lib/showcase';

describe('topic mixture — one turn, one topic', () => {
  it('system prompt forbids unrelated ability mixes and documents the exception', () => {
    expect(BASE_SYSTEM).toMatch(/One topic per reply/i);
    expect(BASE_SYSTEM).toMatch(/Never bolt a second topic or ability invite/i);
    expect(BASE_SYSTEM).toMatch(/dance\s*\/\s*sing\s*\/\s*music/i);
    expect(BASE_SYSTEM).toMatch(/on-topic check-in/i);
    expect(BASE_SYSTEM).toMatch(/MULTI-BEAT EXCEPTION/i);
    expect(BASE_SYSTEM).toMatch(/keyed BYOK/i);
    expect(BASE_SYSTEM).toMatch(/story mode/i);
    expect(personalityPrompt('a01-shino', 'female')).toMatch(/one spoken turn, one topic/i);
    expect(personalityPrompt('a01-shino', 'female')).toMatch(/Never bolt dance/i);
    expect(personalityPrompt('a01-shino', 'female')).toMatch(/keyed BYOK/i);
    expect(personalityPrompt('a01-shino', 'female')).toMatch(/zero questions back/i);
    expect(personalityPrompt('a01-shino', 'male')).toMatch(/zero questions back/i);
  });

  it('exception gating: free short stays one-topic; story / keyed detailed may multi-beat', () => {
    expect(mustStayOneTopic({})).toBe(true);
    expect(mustStayOneTopic({ detailed: true })).toBe(true); // free/keyless detailed still one-topic
    expect(mustStayOneTopic({ keyedBrain: true })).toBe(true); // keyed short still one-topic
    expect(allowsRichTopicMixture({ story: true })).toBe(true);
    expect(allowsRichTopicMixture({ story: true, keyedBrain: false })).toBe(true);
    expect(allowsRichTopicMixture({ detailed: true, keyedBrain: true })).toBe(true);
    expect(allowsRichTopicMixture({ detailed: true, keyedBrain: false })).toBe(false);
    expect(mustStayOneTopic({ detailed: true, keyedBrain: true })).toBe(false);
  });

  it('detects user topics across fun fact, science, weather, news, story', () => {
    expect([...detectUserAbilityTopics('tell me a fun fact about Jupiter')]).toContain('funFact');
    expect([...detectUserAbilityTopics('fun science: why is the sky blue?')]).toContain('funScience');
    expect([...detectUserAbilityTopics("what's the weather here?")]).toContain('weather');
    expect([...detectUserAbilityTopics("what's the latest news?")]).toContain('news');
    expect([...detectUserAbilityTopics('tell me a little story')]).toContain('story');
    expect([...detectUserAbilityTopics('dance for me')]).toContain('dance');
  });

  it('strips dance tack-on after a Jupiter fun fact (classic mix)', () => {
    const user = 'tell me a fun fact about Jupiter';
    const raw =
      "Jupiter is so big that Earth could fit inside it more than a thousand times. Want to see me dancing?";
    const out = stripOffTopicAbilityTacks(raw, user);
    expect(out.toLowerCase()).toContain('jupiter');
    expect(out.toLowerCase()).not.toMatch(/danc/);
    expect(detectAbilityOfferKind('Want to see me dancing?')).toBe('dance');
  });

  it('rich-mixture exception never authorizes ability tack-ons on topical answers', () => {
    // Even when story/BYOK would allow multi-beat, dance must not bolt onto Jupiter.
    const user = 'tell me a fun fact about Jupiter';
    const raw = "Jupiter's Great Red Spot is a storm bigger than Earth. Want to see me dancing?";
    expect(allowsRichTopicMixture({ detailed: true, keyedBrain: true })).toBe(true);
    const out = stripOffTopicAbilityTacks(raw, user);
    expect(out.toLowerCase()).toContain('jupiter');
    expect(out.toLowerCase()).not.toMatch(/danc/);
  });

  it('strips sing / music / weather / news / story pitches after fun science', () => {
    const user = 'tell me some fun science';
    const cases = [
      ['Water expands when it freezes. Want me to sing a song for you?', /sing|song/i],
      ['Lightning is hotter than the sun surface. Want to listen to some music?', /music|tune/i],
      ['Octopuses have three hearts. Want me to check the weather for you?', /weather/i],
      ['Honey never spoils. Shall I share a bit of good news?', /news|headline/i],
      ['Bananas are berries. Shall I tell you a story?', /story/i],
    ] as const;
    for (const [raw, ban] of cases) {
      const out = stripOffTopicAbilityTacks(raw, user);
      expect(out.length, raw).toBeGreaterThan(8);
      expect(out, raw).not.toMatch(ban);
    }
  });

  it('keeps matching ability offers when the user asked for that ability', () => {
    const reply = 'Alright — want to see me dancing?';
    expect(stripOffTopicAbilityTacks(reply, 'dance for me')).toMatch(/danc/i);
    expect(isTopicalContentTurn(demoPhasePrompt('dance', 'en'))).toBe(false);
  });

  it('idle skill-offer mute window after topical/demo content', () => {
    expect(isTopicalContentTurn(demoPhasePrompt('funFact', 'en'))).toBe(true);
    expect(isTopicalContentTurn(demoPhasePrompt('weather', 'en'))).toBe(true);
    const at = 1_000_000;
    expect(shouldSuppressSkillOffer(at, at + 1_000)).toBe(true);
    expect(shouldSuppressSkillOffer(at, at + SKILL_OFFER_SUPPRESS_MS)).toBe(false);
    expect(detectAbilityOfferKind(pickShowcaseOffer('dance', 'en', 0))).toBe('dance');
  });

  it('ChatPanel + client-chat wire the guards', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const chat = fs.readFileSync(path.resolve(here, '../components/ChatPanel.tsx'), 'utf8');
    const client = fs.readFileSync(path.resolve(here, '../lib/client-chat.ts'), 'utf8');
    expect(chat).toContain('shouldSuppressSkillOffer');
    expect(chat).toContain('isTopicalContentTurn');
    expect(
      chat.includes('stripOffTopicAbilityTacks') || chat.includes('stripOfftopicAbilityTack'),
    ).toBe(true);
    expect(client).toContain('mustStayOneTopic');
    expect(client).toContain('stripOffTopicAbilityTacks');
    expect(client).toContain('isKeyedBrain');
    expect(client).toContain('TOPIC MIXTURE');
  });
});
