import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guard: chat room body/face mood is content-driven, not LLM emotion tags.
 */
describe('chat motion is not LLM-controlled', () => {
  const chatPanel = readFileSync(
    resolve(__dirname, '../components/ChatPanel.tsx'),
    'utf8',
  );
  const companion = readFileSync(
    resolve(__dirname, '../lib/companion.ts'),
    'utf8',
  );
  const contentMotion = readFileSync(
    resolve(__dirname, '../lib/content-motion.ts'),
    'utf8',
  );
  const chatAutoIdle = readFileSync(
    resolve(__dirname, '../lib/chat-auto-idle.ts'),
    'utf8',
  );

  it('ChatPanel imports applyContentMood, not applyLlmHints', () => {
    expect(chatPanel).toMatch(/applyContentMood/);
    expect(chatPanel).not.toMatch(/applyLlmHints/);
  });

  it('ChatPanel never applies LLM emotionHints to the face engine', () => {
    expect(chatPanel).not.toMatch(/applyContentMood\(\s*(?:r|data)\.emotionHints/);
    expect(chatPanel).not.toMatch(/speakReply\([^)]*r\.emotionHints/);
    expect(chatPanel).toMatch(/resolveContentMotion/);
  });

  it('commit paths ignore LLM emotionHints and use resolveContentMotion', () => {
    expect(chatPanel).toMatch(/Motion \+ face from chat content only/);
    expect(chatPanel).toMatch(/server emotionHints are not applied/);
  });

  it('applyContentMood writes lexicon, not llmTags', () => {
    expect(companion).toMatch(/function applyContentMood/);
    expect(companion).toMatch(/update\(\{\s*lexicon:/);
    expect(companion).toMatch(/llmTags: hints/);
  });

  it('content-motion wires detectMove + performance-motion preferred clips', () => {
    expect(contentMotion).toMatch(/detectContentMove/);
    expect(contentMotion).toMatch(/resolvePerfMotion/);
    expect(contentMotion).toMatch(/preferredPerfIdleForContent/);
    expect(contentMotion).toMatch(/EMOTION_MOVES/);
    // Must not call applyLlmHints (comment bans are OK).
    expect(contentMotion).not.toMatch(/applyLlmHints\s*\(/);
  });

  it('chat-auto-idle keeps talk calm + user-only dance/sing/music', () => {
    expect(chatAutoIdle).toMatch(/USER_INTENT_CATEGORIES/);
    expect(chatAutoIdle).toMatch(/TALK_CALM/);
    expect(chatAutoIdle).toMatch(/resolvePerfMotion/);
    expect(chatAutoIdle).toMatch(/isTalkCalmText|isCalmTalkContent/);
  });
});
