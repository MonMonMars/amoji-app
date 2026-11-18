import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  audioPlayerBlockHtml,
  buildOwnerMotionPreviewRegistry,
  resolveIdleMotionPreview,
} from '../lib/owner-picker-html-media';
import { idleByClipId } from '../lib/idle-library';

const publicRoot = path.join(__dirname, '..', 'public');

describe('owner-picker-html-media', () => {
  it('scrub ui includes play, stop, and seek', () => {
    const html = audioPlayerBlockHtml('amoji-public-serve/audio/x.mp3', 'x');
    expect(html).toContain('audio-scrub');
    expect(html).toContain('audio-play-toggle');
    expect(html).toContain('audio-stop');
  });

  it('idle preview', () => {
    const lib = idleByClipId('IdleQuaterniusHuman');
    expect(resolveIdleMotionPreview(publicRoot, lib!).kind).toBeTruthy();
  });

  it('registry', () => {
    expect(
      buildOwnerMotionPreviewRegistry(publicRoot).some((r) => r.id.startsWith('perf-motion-')),
    ).toBe(true);
  });
});