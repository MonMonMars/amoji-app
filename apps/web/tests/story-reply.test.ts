import { describe, expect, it } from 'vitest';
import {
  STORY_MAX_TOKENS,
  maxTokensForStoryTurn,
  storySystemBlock,
  userWantsStory,
  wantsStoryTurn,
} from '../lib/story-reply';
import { shapeCompanionReply, REPLY_BUDGET } from '../lib/reply-shape';
import { wantsDetail } from '../lib/client-chat';

const longEn =
  'Once there was a lantern maker who only worked on rainy nights. '
  + 'He said the drops on the glass taught him where the light should bend. '
  + 'One evening a stranger asked him to fix a lamp that had been dark for years. '
  + 'The maker smiled, opened the case, and found not broken glass but a moth asleep inside. '
  + 'He whispered that some lights refuse to shine until someone sits long enough to listen. '
  + 'When the moth woke, the room filled with gold, and the stranger finally understood why he had been afraid of the dark.';

const dense = (s: string) => s.replace(/\s/g, '').length;

describe('story intent detection', () => {
  it('recognises explicit story asks in English and CJK', () => {
    expect(userWantsStory('tell me a story')).toBe(true);
    expect(userWantsStory('Can you narrate a little tale?')).toBe(true);
    expect(userWantsStory('講個故事俾我聽')).toBe(true);
    expect(userWantsStory('讲个故事吧')).toBe(true);
    expect(userWantsStory('繼續講')).toBe(true);
    expect(userWantsStory('go on, what happens next')).toBe(true);
  });

  it('does not treat weather or news asks as story', () => {
    expect(userWantsStory('今日天氣點呀')).toBe(false);
    expect(userWantsStory('Any news near me?')).toBe(false);
    expect(userWantsStory('hello')).toBe(false);
  });

  it('wantsStoryTurn when session flag or persona beat is live', () => {
    expect(wantsStoryTurn('你好', { storySession: true })).toBe(true);
    expect(wantsStoryTurn('嗨', { persona: 'STORY MODE: train scene' })).toBe(true);
    expect(wantsStoryTurn('講個故事')).toBe(true);
    expect(wantsStoryTurn('just chatting')).toBe(false);
  });
});

describe('story token budget and shaping', () => {
  it('raises max_tokens for story but keeps recipe/weather paths short', () => {
    expect(maxTokensForStoryTurn(true, false)).toBe(STORY_MAX_TOKENS);
    expect(maxTokensForStoryTurn(false, true)).toBe(520);
    expect(maxTokensForStoryTurn(false, false)).toBe(280);
    expect(wantsDetail('Weather: 21°C, clear.')).toBe(false);
    expect(wantsDetail('Recipe: tomato soup.')).toBe(true);
  });

  it('does not trim a long narrative when detailed mode is on (story path)', () => {
    const trimmed = shapeCompanionReply(longEn);
    const full = shapeCompanionReply(longEn, { detailed: true });
    expect(dense(trimmed)).toBeLessThan(dense(longEn));
    expect(full).toBe(longEn);
    expect(dense(full)).toBeGreaterThan(REPLY_BUDGET.latin);
  });

  it('story system block overrides the short-reply rules', () => {
    expect(storySystemBlock('en')).toMatch(/multiple paragraphs/i);
    expect(storySystemBlock('yue')).toMatch(/唔使跟住/);
  });
});
