import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const voice = readFileSync(join(__dirname, '../lib/voice.ts'), 'utf8');
const panel = readFileSync(join(__dirname, '../components/ChatPanel.tsx'), 'utf8');
const listen = readFileSync(join(__dirname, '../lib/listen.ts'), 'utf8');

describe('voice echo: first-sentence re-speak skip', () => {
  it('normalizes queued speak text the same way speak() cleans', () => {
    expect(voice).toMatch(/export function normalizeQueuedSpeakText/);
    expect(voice).toMatch(/speechStillQueued[\s\S]*normalizeQueuedSpeakText/);
    expect(voice).toMatch(/rawSpeechRemainder\(full, already, \(s\) => stripLaughTokens\(cleanForSpeech\(s\)\)\)/);
  });

  it('records lastCompanionSpoken for mic self-echo guards', () => {
    expect(voice).toMatch(/lastCompanionSpokenLine = cleaned/);
    expect(voice).toMatch(/export function lastCompanionSpoken/);
  });
});

describe('voice echo: mic self-hearing guard', () => {
  it('wires shouldIgnoreSpeech with looksLikeSpeechEcho', () => {
    expect(panel).toMatch(/shouldIgnoreSpeech:\s*\(heard\)\s*=>\s*looksLikeSpeechEcho\(heard,\s*lastCompanionSpoken\(\)\)/);
    expect(listen).toMatch(/shouldIgnoreSpeech\?:/);
    expect(listen).toMatch(/opts\.shouldIgnoreSpeech\?\.\(heard\)/);
  });

  it('keeps ungated Web Speech barge-in for real user words', () => {
    const listenStart = panel.indexOf('listenContinuous(lang,');
    const listenBlock = panel.slice(listenStart, panel.indexOf('void startVad({', listenStart));
    expect(listenBlock).toMatch(/onSpeechStart:\s*\(\)\s*=>\s*\{[\s\S]*?stopSpeaking\(\)/);
    expect(listenBlock).not.toMatch(/onSpeechStart:[\s\S]*!isSpeaking\(\)/);
  });
});
