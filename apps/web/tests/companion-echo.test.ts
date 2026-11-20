import { describe, expect, it } from 'vitest';
import { isCompanionEcho, normalizeHeardText } from '../lib/companion-echo';

describe('isCompanionEcho', () => {
  const cheer = "Hi Pixel, I'm Saori. I can chat, tell the weather, or we can just hang out.";

  it('treats a full welcome transcription as echo', () => {
    expect(isCompanionEcho(cheer, [cheer])).toBe(true);
  });

  it('treats a long prefix of the welcome as echo', () => {
    expect(isCompanionEcho("Hi Pixel, I'm Saori. I can chat", [cheer])).toBe(true);
  });

  it('does not treat a short greeting as echo of a longer welcome', () => {
    expect(isCompanionEcho('hi', [cheer])).toBe(false);
    expect(isCompanionEcho('hello', [cheer])).toBe(false);
  });

  it('does not treat a real user reply as echo', () => {
    expect(isCompanionEcho('what is the weather today?', [cheer])).toBe(false);
  });

  it('ignores punctuation and case', () => {
    expect(normalizeHeardText("Hi, Pixel!")).toBe('hipixel');
    expect(isCompanionEcho('HI PIXEL, IM SAORI. I CAN CHAT, TELL THE WEATHER, OR WE CAN JUST HANG OUT', [cheer])).toBe(true);
  });
});
