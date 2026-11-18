import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  OWNER_PICKER_PREVIEW_SUBDIR,
  audioPlayerBlockHtml,
  buildOwnerMotionPreviewRegistry,
  motionPreviewCellHtml,
  ownerPickerSidecarPreview,
  pokeSectionMotionPreview,
  resolveIdleMotionPreview,
  resolvePerfMotionPreview,
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

  it('perf-motion previews map each tag to its own sidecar (not lib_C61 for all)', () => {
    const c112 = resolvePerfMotionPreview(publicRoot, 'C112');
    const c113 = resolvePerfMotionPreview(publicRoot, 'C113');
    expect(c112.pagesSrc).toContain('lib_C112.gif');
    expect(c113.pagesSrc).not.toBe(c112.pagesSrc);
    expect(c113.pagesSrc).toMatch(/lib_C113|lib_C61/);
    const allSame = ['C112', 'C114', 'C110'].every(
      (tag) => resolvePerfMotionPreview(publicRoot, tag as 'C112').pagesSrc === c112.pagesSrc,
    );
    expect(allSame).toBe(false);
  });

  it('poke section preview uses underscore asset id', () => {
    const prev = pokeSectionMotionPreview(publicRoot, 'poke:head:front');
    expect(prev.pagesSrc).toContain('poke_head_front.gif');
  });
});