import { describe, expect, it } from 'vitest';
import {
  DEMO_PHASE_TO_REPLY_MODE,
  REPLY_MODE_CHART,
  maxTokensForReplyMode,
  replyModeSystemBlock,
  resolveReplyMode,
  type ReplyModeId,
} from '../lib/reply-mode';
import {
  DEFAULT_CHAT_MAX_TOKENS,
  HELP_MAX_TOKENS,
  SCIENCE_MAX_TOKENS,
} from '../lib/long-talk';
import { STORY_MAX_TOKENS } from '../lib/story-reply';

describe('REPLY_MODE_CHART mapping table', () => {
  it('covers required modes with length + emotion + talkVsMusic', () => {
    const required: ReplyModeId[] = [
      'casual',
      'story',
      'science',
      'news',
      'weather',
      'music',
      'help',
    ];
    for (const id of required) {
      const row = REPLY_MODE_CHART[id];
      expect(row.id).toBe(id);
      expect(row.targetLength).toBeTruthy();
      expect(row.emotion.length).toBeGreaterThan(3);
      expect(row.talkVsMusic).toBeTruthy();
      expect(row.sentenceGuide.length).toBeGreaterThan(3);
      expect(row.maxTokens).toBeGreaterThan(0);
    }
  });

  it('matches owner length intent: story long, casual short, science super-long, music short talk, news long', () => {
    expect(REPLY_MODE_CHART.casual.targetLength).toBe('very_short');
    expect(REPLY_MODE_CHART.story.targetLength).toBe('long');
    expect(REPLY_MODE_CHART.science.targetLength).toBe('super_long');
    expect(REPLY_MODE_CHART.music.targetLength).toBe('very_short');
    expect(REPLY_MODE_CHART.music.talkVsMusic).toBe('short_talk_long_music');
    expect(REPLY_MODE_CHART.weather.talkVsMusic).toBe('tool_spoken_facts');
    expect(REPLY_MODE_CHART.news.talkVsMusic).toBe('tool_spoken_facts');
    expect(REPLY_MODE_CHART.news.targetLength).toBe('long');
    expect(REPLY_MODE_CHART.news.maxTokens).toBe(HELP_MAX_TOKENS);
    expect(REPLY_MODE_CHART.news.sentenceGuide).toMatch(/lede|details/i);
    expect(REPLY_MODE_CHART.story.maxTokens).toBe(STORY_MAX_TOKENS);
    expect(REPLY_MODE_CHART.science.maxTokens).toBe(SCIENCE_MAX_TOKENS);
    expect(REPLY_MODE_CHART.help.maxTokens).toBe(HELP_MAX_TOKENS);
    expect(REPLY_MODE_CHART.casual.maxTokens).toBe(DEFAULT_CHAT_MAX_TOKENS);
    expect(REPLY_MODE_CHART.music.maxTokens).toBeLessThan(REPLY_MODE_CHART.casual.maxTokens);
    expect(REPLY_MODE_CHART.science.maxTokens).toBeGreaterThan(REPLY_MODE_CHART.casual.maxTokens);
  });

  it('maps demo-phase chips into the chart', () => {
    expect(DEMO_PHASE_TO_REPLY_MODE.story).toBe('story');
    expect(DEMO_PHASE_TO_REPLY_MODE.funScience).toBe('science');
    expect(DEMO_PHASE_TO_REPLY_MODE.sing).toBe('music');
    expect(DEMO_PHASE_TO_REPLY_MODE.dance).toBe('music');
    expect(DEMO_PHASE_TO_REPLY_MODE.music).toBe('music');
    expect(DEMO_PHASE_TO_REPLY_MODE.weather).toBe('weather');
    expect(DEMO_PHASE_TO_REPLY_MODE.news).toBe('news');
  });
});

describe('resolveReplyMode detection', () => {
  it('priority: music beats science/story wording', () => {
    expect(resolveReplyMode('sing a song about gravity').id).toBe('music');
    expect(resolveReplyMode('跳舞').id).toBe('music');
    expect(resolveReplyMode('播音樂').id).toBe('music');
    expect(resolveReplyMode('hi', { musicMatched: true }).id).toBe('music');
  });

  it('detects story / science / help / casual', () => {
    expect(resolveReplyMode('tell me a story').id).toBe('story');
    expect(resolveReplyMode('講個故事').id).toBe('story');
    expect(resolveReplyMode('你好', { storySession: true }).id).toBe('story');
    expect(resolveReplyMode('why is the sky blue?').id).toBe('science');
    expect(resolveReplyMode('tell me a fun science fact').id).toBe('science');
    expect(resolveReplyMode('how do I reset my Wi-Fi?').id).toBe('help');
    expect(resolveReplyMode('hi there').id).toBe('casual');
  });

  it('detects weather / news from text or live world block', () => {
    expect(resolveReplyMode("what's the weather here?").id).toBe('weather');
    expect(resolveReplyMode('hello', { world: 'Weather: 22C sunny' }).id).toBe('weather');
    expect(resolveReplyMode("what's the latest news?").id).toBe('news');
    expect(resolveReplyMode('ok', { world: 'Light news: Cats win prize' }).id).toBe('news');
  });

  it('uses demo-phase chip when text alone is ambiguous', () => {
    expect(resolveReplyMode('go', { demoPhaseId: 'funScience' }).id).toBe('science');
    expect(resolveReplyMode('go', { demoPhaseId: 'sing' }).id).toBe('music');
    expect(resolveReplyMode('go', { demoPhaseId: 'joke' }).id).toBe('joke');
  });
});

describe('replyModeSystemBlock prompt directives', () => {
  const modes: ReplyModeId[] = [
    'casual',
    'story',
    'science',
    'news',
    'weather',
    'music',
    'help',
  ];

  it('includes length and emotion directives for every mapped mode', () => {
    for (const id of modes) {
      const mode = REPLY_MODE_CHART[id];
      const en = replyModeSystemBlock(mode, 'en');
      expect(en).toMatch(/REPLY MODE:/);
      expect(en).toMatch(/LENGTH \(/);
      expect(en).toMatch(/EMOTION:/);
      expect(en).toContain(mode.targetLength.toUpperCase());
      expect(en.toLowerCase()).toContain(mode.emotion.split('+')[0]!.trim().toLowerCase());

      const yue = replyModeSystemBlock(mode, 'yue');
      expect(yue).toMatch(/REPLY MODE/);
      expect(yue).toMatch(/長度/);
      expect(yue).toMatch(/情緒/);
    }
  });

  it('music mode forbids lyric banks and keeps talk short', () => {
    const block = replyModeSystemBlock(REPLY_MODE_CHART.music, 'en');
    expect(block).toMatch(/very_short/i);
    expect(block).toMatch(/lyrics/i);
    expect(block).toMatch(/short talk \+ long music/i);
    expect(maxTokensForReplyMode(REPLY_MODE_CHART.music)).toBe(120);
  });

  it('story/science embed long-talk structure plus chart emotion', () => {
    const story = replyModeSystemBlock(REPLY_MODE_CHART.story, 'en');
    expect(story).toMatch(/STORY \/ NARRATIVE/);
    expect(story).toMatch(/excitement/i);
    const science = replyModeSystemBlock(REPLY_MODE_CHART.science, 'en');
    expect(science).toMatch(/SCIENCE \/ FUN-FACT/);
    expect(science).toMatch(/super_long/i);
  });

  it('weather/news stay statement-only', () => {
    expect(replyModeSystemBlock(REPLY_MODE_CHART.weather, 'en')).toMatch(/statement-only/i);
    expect(replyModeSystemBlock(REPLY_MODE_CHART.news, 'en')).toMatch(/statement-only/i);
  });

  it('news mode asks for headline + lede + key details', () => {
    const block = replyModeSystemBlock(REPLY_MODE_CHART.news, 'en');
    expect(block).toMatch(/LONG/i);
    expect(block).toMatch(/lede|details/i);
    expect(block).toMatch(/never invent|one-liner/i);
  });
});
