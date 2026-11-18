import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  isExternalOwnerPickerPlaySrc,
  normalizeExternalOwnerPickerPlaySrc,
  pagesAssetSrcFromPickerRaw,
} from '../lib/owner-picker-media';
import { verifyOwnerResourcesPagesAssets } from '../scripts/store-bundle.mjs';

const mixkit =
  'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3';

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