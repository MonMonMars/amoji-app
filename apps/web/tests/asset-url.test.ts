import { afterEach, describe, expect, it } from 'vitest';
import { assetUrl } from '../lib/asset';

afterEach(() => {
  delete process.env.NEXT_PUBLIC_BASE_PATH;
});

describe('assetUrl basePath', () => {
  it('prefixes once and stays idempotent when already prefixed', () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    expect(assetUrl('/voice-clips/x.mp3')).toBe('/voice-clips/x.mp3');

    process.env.NEXT_PUBLIC_BASE_PATH = '/amoji-app';
    expect(assetUrl('/voice-clips/x.mp3')).toBe('/amoji-app/voice-clips/x.mp3');
    expect(assetUrl('/amoji-app/voice-clips/x.mp3')).toBe('/amoji-app/voice-clips/x.mp3');
    expect(assetUrl('https://cdn.example/a.mp3')).toBe('https://cdn.example/a.mp3');
  });
});
