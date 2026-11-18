import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  OWNER_PICKER_PREVIEW_SUBDIR,
  audioPlayerBlockHtml,
  buildOwnerMotionPreviewRegistry,
  motionPreviewCellHtml,
  ownerPickerSidecarPreview,
  resolveIdleMotionPreview,
} from '../lib/owner-picker-html-media';
import { idleByClipId } from '../lib/idle-library';

const publicRoot = path.join(__dirname, '..', 'public');

describe('owner-picker-html-media', () => {
  it('audio player includes scrub ui', () => {
    expect(audioPlayerBlockHtml('amoji-public-serve/audio/x.mp3', 'x')).toContain('audio-scrub');
  });

  it('motion preview cell uses onerror fallback for img', () => {
    const html = motionPreviewCellHtml({
      id: 'IdleQuaterniusHuman',
      kind: 'gif',
      assetRaw: 'amoji-public-serve/x.gif',
      pagesSrc: '../animations/owner-picker-previews/IdleQuaterniusHuman.gif',
    });
    expect(html).toContain('onerror=');
    expect(html).toContain('motion-preview--broken');
  });

  it('idle preview prefers sidecar gif when baked', () => {
    const sidecar = ownerPickerSidecarPreview(publicRoot, 'IdleQuaterniusHuman');
    const lib = idleByClipId('IdleQuaterniusHuman');
    expect(lib).toBeTruthy();
    const prev = resolveIdleMotionPreview(publicRoot, lib!);
    if (sidecar) {
      expect(prev.kind).toBe('gif');
      expect(prev.pagesSrc).toContain(OWNER_PICKER_PREVIEW_SUBDIR);
    } else {
      expect(['vrma', 'placeholder']).toContain(prev.kind);
    }
  });

  it('registry includes perf-motion rows', () => {
    expect(buildOwnerMotionPreviewRegistry(publicRoot).some((r) => r.id.startsWith('perf-motion-'))).toBe(
      true,
    );
  });
});