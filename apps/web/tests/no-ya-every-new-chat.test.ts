/**
 * Owner: every new chat must not prepend 呀！ from joy INTERJECTIONS on the
 * open cheer. Root cause was analyzeText(開心) on persona intro merging into
 * speak() mood tics above INTERJECTION_AT while open hints stay ~0.55–0.58.
 */
import { describe, it, expect } from 'vitest';
import { analyzeText } from '@amoji/emotion-core';
import { INTERJECTIONS, INTERJECTION_AT, dominant, pickInterjection } from '../lib/fillers';
import { buildOpenCheerLine } from '../lib/open-phase';
import { emotionClipKind } from '../lib/voice-clips';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');

describe('no 呀 on new-chat open cheer', () => {
  it('open-cheer joy hints stay below interjection gate', () => {
    expect(INTERJECTION_AT).toBeGreaterThanOrEqual(0.72);
    expect(0.58).toBeLessThan(INTERJECTION_AT);
    expect(0.55).toBeLessThan(INTERJECTION_AT);
  });

  it('persona 開心 in open line must not imply a yue joy tic via hints alone', () => {
    const line = buildOpenCheerLine('yue', {
      nameHello: '早晨，阿明',
      personaIntro: '你好，我係Shino！我好容易因為小事開心，尤其係茶。',
    });
    const felt = dominant({ joy: 0.58 });
    expect(pickInterjection(felt.emotion, felt.value, 'yue')).toBeUndefined();
    // Open cheer passes sub-threshold hints even when the line mentions 開心.
    expect(pickInterjection(dominant({ joy: 0.58, ...analyzeText(line) }).emotion, 0.58, 'yue')).toBeUndefined();
  });

  it('speak() mood tics use caller emotionHints only (not reply lexicon)', () => {
    const body = fs.readFileSync(path.join(ROOT, 'lib/voice.ts'), 'utf8');
    expect(body).toContain('dominant(emotionHints)');
    expect(body).toContain('pickInterjection(ticEmotion, ticValue, lang)');
    expect(body).not.toMatch(/pickInterjection\(emotion, value, lang\)/);
  });

  it('ChatPanel open cheer passes sub-threshold joy hints', () => {
    const panel = fs.readFileSync(path.join(ROOT, 'components/ChatPanel.tsx'), 'utf8');
    expect(panel).toMatch(/openHints[\s\S]*joy: 0\.5[58]/);
  });

  it('the joy tic is a TTS interjection, not a yue burst clip (#450, 2026-11-26)', () => {
    // The old text was 呀！; the owner then rejected a lone 呀 opener, so the
    // tic is now a real cheer. What must still hold: it is spoken by TTS and
    // never resolved to a pre-baked yue clip.
    const cheer = INTERJECTIONS.joy?.yue?.text ?? '';
    expect(cheer).toBeTruthy();
    expect(cheer).not.toBe('呀！');
    expect(emotionClipKind(cheer, 'lead')).toBeNull();
    expect(emotionClipKind('呀！', 'lead')).toBeNull();
  });
});