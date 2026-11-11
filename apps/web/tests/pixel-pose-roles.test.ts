import { describe, expect, it } from 'vitest';
import {
  PIXEL_CALM_IDLE_NUMS,
  PIXEL_OK_IDLE_NUMS,
  PIXEL_PERF_OK_NUMS,
  isPixelCalmIdleClip,
  isPixelPerfOkClip,
  resolveCalmIdleClipId,
  resolveIdleClipId,
} from '../lib/idle-catalog-review';
import { CHAT_IDLE_CURATED } from '../lib/idle-curated-rail';
import { idleByNum } from '../lib/idle-library';
import { resolveChatAutoIdle } from '../lib/chat-auto-idle';

/** Pixel: OK poses only; calm for idle/talk; perf for matching moves. */
describe('Pixel pose roles (OK + suitable use)', () => {
  it('calm and perf partition the OK set with no overlap', () => {
    for (const n of PIXEL_CALM_IDLE_NUMS) {
      expect(PIXEL_OK_IDLE_NUMS.has(n)).toBe(true);
      expect(PIXEL_PERF_OK_NUMS.has(n)).toBe(false);
    }
    for (const n of PIXEL_PERF_OK_NUMS) {
      expect(PIXEL_OK_IDLE_NUMS.has(n)).toBe(true);
      expect(PIXEL_CALM_IDLE_NUMS.has(n)).toBe(false);
    }
    expect(PIXEL_CALM_IDLE_NUMS.size + PIXEL_PERF_OK_NUMS.size).toBe(PIXEL_OK_IDLE_NUMS.size);
  });

  it('chat rail is calm-only; dance/sing/react stay off idle rail', () => {
    for (const e of CHAT_IDLE_CURATED) {
      expect(PIXEL_CALM_IDLE_NUMS.has(e.legacyLibNum)).toBe(true);
    }
    for (const n of [20, 22, 41, 101, 102, 103, 108, 109, 113, 114]) {
      expect(CHAT_IDLE_CURATED.some((r) => r.legacyLibNum === n)).toBe(false);
      expect(isPixelPerfOkClip(idleByNum(n)!.clipId)).toBe(true);
    }
  });

  it('ordinary talk / greet never picks look-search or performance clips', () => {
    const talk = resolveChatAutoIdle({ assistantText: 'Sure, here is the answer.' });
    const greet = resolveChatAutoIdle({ assistantText: '', openGreet: true });
    for (const clip of [talk, greet]) {
      expect(clip).toBeTruthy();
      expect(isPixelCalmIdleClip(clip!)).toBe(true);
      expect(['IdleRpmFStanding001', 'IdleSassy']).toContain(clip);
      expect(clip).not.toBe('LookAround');
      expect(isPixelPerfOkClip(clip!)).toBe(false);
    }
  });

  it('user-asked dance / sing resolve to performance OK, not calm remap', () => {
    const dance = resolveChatAutoIdle({ userText: '跳舞吧', assistantText: '好' });
    const sing = resolveChatAutoIdle({ userText: '唱首歌', assistantText: '好' });
    expect(isPixelPerfOkClip(dance!)).toBe(true);
    expect(resolveCalmIdleClipId(dance!)).toBe('IdleRpmFStanding001');
    expect(resolveIdleClipId(dance!)).toBe(dance);
    expect(isPixelPerfOkClip(sing!) || isPixelCalmIdleClip(sing!)).toBe(true);
  });
});
