import { afterEach, describe, expect, it } from 'vitest';
import { assetUrl, stripBasePath } from '../lib/asset';

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

describe('stripBasePath', () => {
  it('removes NEXT_PUBLIC_BASE_PATH once and leaves bare paths alone', () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    expect(stripBasePath('/voice-clips/x.mp3')).toBe('/voice-clips/x.mp3');

    process.env.NEXT_PUBLIC_BASE_PATH = '/amoji-app';
    expect(stripBasePath('/amoji-app/voice-clips/x.mp3')).toBe('/voice-clips/x.mp3');
    expect(stripBasePath('/voice-clips/x.mp3')).toBe('/voice-clips/x.mp3');
    expect(stripBasePath('/amoji-app')).toBe('/');
    expect(stripBasePath('https://cdn.example/a.mp3')).toBe('https://cdn.example/a.mp3');
  });
});
