import { describe, expect, it } from 'vitest';
import { PICKER_PLAY_RESOLVE_INLINE_JS, isExternalOwnerPickerPlaySrc, pagesAssetSrcFromPickerRaw } from '../lib/owner-picker-media.mjs';
describe('owner-picker-media', () => {
  it('external mixkit', () => { expect(isExternalOwnerPickerPlaySrc('https://assets.mixkit.co/x.mp3')).toBe(true); });
  it('pages rewrite', () => { expect(pagesAssetSrcFromPickerRaw('amoji-public-serve/audio/x.mp3')).toBe('../audio/x.mp3'); });
  it('inline js', () => { expect(PICKER_PLAY_RESOLVE_INLINE_JS).toContain('resolvePlaySrc'); });
});
