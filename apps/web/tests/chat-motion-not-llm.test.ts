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
});
