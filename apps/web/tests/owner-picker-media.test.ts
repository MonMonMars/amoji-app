import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { audioPlayerBlockHtml } from '../lib/owner-picker-html-media';
import {
  isExternalOwnerPickerPlaySrc,
  normalizeExternalOwnerPickerPlaySrc,
  pagesAssetSrcFromPickerRaw,
  PICKER_PLAY_RESOLVE_INLINE_JS,
} from '../lib/owner-picker-media';
import { verifyOwnerResourcesPagesAssets } from '../scripts/store-bundle.mjs';

const mixkit =
  'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3';

describe('owner-picker-html-media', () => {
  it('audio row includes play, scrub, and stop', () => {
    const html = audioPlayerBlockHtml('amoji-public-serve/audio/x.mp3', 'test clip');
    expect(html).toContain('audio-play-toggle');
    expect(html).toContain('audio-stop');
    expect(html).toContain('audio-scrub');
    expect(html).toContain('audio-cur');
  });
});

describe('owner-picker-media', () => {
  it('treats Mixkit URLs as external (never ../ rewrite)', () => {
    expect(isExternalOwnerPickerPlaySrc(mixkit)).toBe(true);
    expect(pagesAssetSrcFromPickerRaw(mixkit)).toBe(mixkit);
    expect(pagesAssetSrcFromPickerRaw('assets.mixkit.co/music/preview/x.mp3')).toBe(
      'https://assets.mixkit.co/music/preview/x.mp3',
    );
    expect(pagesAssetSrcFromPickerRaw('//assets.mixkit.co/music/preview/x.mp3')).toBe(
      'https://assets.mixkit.co/music/preview/x.mp3',
    );
  });

  it('rewrites amoji-public-serve paths for Pages layout', () => {
    expect(pagesAssetSrcFromPickerRaw('amoji-public-serve/audio/dance/x.mp3')).toBe(
      '../audio/dance/x.mp3',
    );
  });

  it('normalizeExternalOwnerPickerPlaySrc leaves https untouched', () => {
    expect(normalizeExternalOwnerPickerPlaySrc(mixkit)).toBe(mixkit);
  });

  it('inline player script exposes resolvePlaySrc', () => {
    expect(PICKER_PLAY_RESOLVE_INLINE_JS).toContain('resolvePlaySrc');
    expect(PICKER_PLAY_RESOLVE_INLINE_JS).toContain('pickerPlayFailureMessage');
  });
});

describe('verifyOwnerResourcesPagesAssets + Mixkit', () => {
  it('does not flag remote Mixkit data-play as missing local files', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'amoji-mixkit-verify-'));
    try {
      const docsDir = path.join(dir, 'docs');
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(
        path.join(docsDir, 'owner-resources.html'),
        `<button data-play="${mixkit}"></button>`,
      );
      const check = verifyOwnerResourcesPagesAssets(dir);
      expect(check.ok, JSON.stringify(check)).toBe(true);
      expect(check.missing).toHaveLength(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('does not require local files for scheme-less mixkit host', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'amoji-mixkit-verify-'));
    try {
      const docsDir = path.join(dir, 'docs');
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(
        path.join(docsDir, 'owner-resources.html'),
        `<button data-play="assets.mixkit.co/music/preview/x.mp3"></button>`,
      );
      const check = verifyOwnerResourcesPagesAssets(dir);
      expect(check.ok, JSON.stringify(check)).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});