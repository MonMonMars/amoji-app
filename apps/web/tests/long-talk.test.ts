import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CHAT_MAX_TOKENS,
  DETAILED_RECIPE_MAX_TOKENS,
  HELP_MAX_TOKENS,
  SCIENCE_MAX_TOKENS,
  detectLongTalkKind,
  helpSystemBlock,
  longTalkSystemBlock,
  maxTokensForLongTalk,
  scienceSystemBlock,
  userWantsHelp,
  userWantsScience,
  wantsLongTalk,
} from '../lib/long-talk';
import { STORY_MAX_TOKENS } from '../lib/story-reply';
import { shapeCompanionReply, REPLY_BUDGET } from '../lib/reply-shape';
import { wantsLongCompanionReply } from '../lib/topic-suggestions';
import { wantsDetail } from '../lib/client-chat';

const dense = (s: string) => s.replace(/\s/g, '').length;

const scienceEn =
  'Octopuses have three hearts — two push blood through the gills and one sends it around the body. '
  + 'When an octopus swims, that body-heart nearly pauses, which is why they prefer crawling. '
  + 'Copper in their blood makes it blue instead of red, handy in cold low-oxygen water. '
  + 'A fun everyday picture: picture three tiny pumps sharing one quiet underwater commute.';

const helpEn =
  'Sounds like the Wi-Fi is dropping the handshake. '
  + '1. Toggle airplane mode on, wait ten seconds, then off. '
  + '2. Forget the network and join again with the password. '
  + '3. Restart the router if it still fails. '
  + 'Tell me what step you reach and we can nudge the next one.';

describe('long-talk intent detection', () => {
  it('detects science and fun-fact asks in English and CJK', () => {
    expect(userWantsScience('tell me a fun fact about space')).toBe(true);
    expect(userWantsScience('why is the sky blue?')).toBe(true);
    expect(userWantsScience('what is gravity?')).toBe(true);
    expect(userWantsScience('講啲科學趣聞俾我聽')).toBe(true);
    expect(userWantsScience('讲个有趣冷知识')).toBe(true);
    expect(userWantsScience('why are you sad?')).toBe(false);
    expect(userWantsScience('hello')).toBe(false);
  });

  it('detects simple problem-help without swallowing bare help-me', () => {
    expect(userWantsHelp('how do I reset my Wi-Fi?')).toBe(true);
    expect(userWantsHelp('my printer will not work')).toBe(true);
    expect(userWantsHelp('help me fix the bluetooth')).toBe(true);
    expect(userWantsHelp('點樣整返個 Wi-Fi')).toBe(true);
    expect(userWantsHelp('怎么办啊连不上网')).toBe(true);
    expect(userWantsHelp('help me')).toBe(false);
    expect(userWantsHelp('幫幫我')).toBe(false);
    expect(userWantsHelp('how to dance')).toBe(false);
    expect(userWantsHelp('sing a song')).toBe(false);
  });

  it('priority is story → science → help', () => {
    expect(detectLongTalkKind('tell me a story about gravity')).toBe('story');
    expect(detectLongTalkKind('what is photosynthesis?')).toBe('science');
    expect(detectLongTalkKind('how to fix my headphones')).toBe('help');
    expect(detectLongTalkKind('hi there')).toBeNull();
    expect(detectLongTalkKind('你好', { storySession: true })).toBe('story');
  });

  it('wantsLongCompanionReply covers science and help', () => {
    expect(wantsLongCompanionReply('tell me some fun science')).toBe(true);
    expect(wantsLongCompanionReply('how do I connect bluetooth')).toBe(true);
    expect(wantsLongCompanionReply('hi')).toBe(false);
    expect(wantsDetail(undefined, 'how do I fix my wifi')).toBe(true);
    expect(wantsLongTalk('講個故事')).toBe(true);
  });
});

describe('long-talk budgets and system blocks', () => {
  it('raises max_tokens per mode and keeps default chat short', () => {
    expect(maxTokensForLongTalk('story')).toBe(STORY_MAX_TOKENS);
    expect(maxTokensForLongTalk('science')).toBe(SCIENCE_MAX_TOKENS);
    expect(maxTokensForLongTalk('help')).toBe(HELP_MAX_TOKENS);
    expect(maxTokensForLongTalk(null, true)).toBe(DETAILED_RECIPE_MAX_TOKENS);
    expect(maxTokensForLongTalk(null, false)).toBe(DEFAULT_CHAT_MAX_TOKENS);
    expect(SCIENCE_MAX_TOKENS).toBeGreaterThan(DEFAULT_CHAT_MAX_TOKENS);
    expect(HELP_MAX_TOKENS).toBeGreaterThan(DEFAULT_CHAT_MAX_TOKENS);
    expect(STORY_MAX_TOKENS).toBeGreaterThan(SCIENCE_MAX_TOKENS);
  });

  it('system blocks override short-reply rules in en and yue', () => {
    expect(scienceSystemBlock('en')).toMatch(/fact → why/i);
    expect(scienceSystemBlock('yue')).toMatch(/唔使跟住/);
    expect(helpSystemBlock('en')).toMatch(/2–5 clear steps/);
    expect(helpSystemBlock('yue')).toMatch(/2–5 個短步驟/);
    expect(longTalkSystemBlock('story', 'en')).toMatch(/6–14 sentences/);
    expect(longTalkSystemBlock('science', 'en')).toMatch(/SCIENCE/);
    expect(longTalkSystemBlock('help', 'en')).toMatch(/PROBLEM-HELP/);
  });

  it('does not trim long science or help replies in detailed mode', () => {
    const sciTrim = shapeCompanionReply(scienceEn);
    const sciFull = shapeCompanionReply(scienceEn, { detailed: true });
    expect(dense(sciTrim)).toBeLessThan(dense(scienceEn));
    expect(sciFull).toBe(scienceEn);
    expect(dense(sciFull)).toBeGreaterThan(REPLY_BUDGET.latin);

    const helpFull = shapeCompanionReply(helpEn, { detailed: true });
    expect(helpFull).toBe(helpEn);
  });
});
