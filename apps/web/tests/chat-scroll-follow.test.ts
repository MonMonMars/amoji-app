import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  scheduleChatScrollToLatest,
  scrollChatHistoryToLatest,
  shouldFollowLiveChat,
} from '../lib/chat-scroll-follow';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

describe('chat scroll follow-live', () => {
  it('always follows live chat even after the user scrolled away', () => {
    expect(shouldFollowLiveChat(false)).toBe(true);
    expect(shouldFollowLiveChat(true)).toBe(true);
  });

  it('scrollChatHistoryToLatest jumps to scrollHeight', () => {
    const scrollTo = vi.fn();
    const el = { scrollHeight: 900, scrollTop: 40, scrollTo };
    scrollChatHistoryToLatest(el);
    expect(scrollTo).toHaveBeenCalledWith({ top: 900, behavior: 'auto' });
  });

  it('scrollChatHistoryToLatest no-ops on null and falls back without scrollTo', () => {
    expect(() => scrollChatHistoryToLatest(null)).not.toThrow();
    const el = { scrollHeight: 400, scrollTop: 12 };
    scrollChatHistoryToLatest(el);
    expect(el.scrollTop).toBe(400);
  });

  it('scheduleChatScrollToLatest double-rAF then scrolls', () => {
    const scrollTo = vi.fn();
    const el = { scrollHeight: 1200, scrollTop: 0, scrollTo };
    const priorRaf = globalThis.requestAnimationFrame;
    let calls = 0;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      calls += 1;
      cb(0);
      return calls;
    }) as typeof requestAnimationFrame;
    scheduleChatScrollToLatest(el);
    expect(calls).toBeGreaterThanOrEqual(2);
    expect(scrollTo).toHaveBeenCalledWith({ top: 1200, behavior: 'auto' });
    if (priorRaf) globalThis.requestAnimationFrame = priorRaf;
    else delete (globalThis as { requestAnimationFrame?: typeof requestAnimationFrame }).requestAnimationFrame;
  });

  it('ChatPanel forces follow on history + caption updates (no nearBottom gate)', () => {
    const panel = read('components/ChatPanel.tsx');
    expect(panel).toContain('scheduleChatScrollToLatest');
    expect(panel).toContain('shouldFollowLiveChat');
    expect(panel).toContain('useLayoutEffect');
    // Old sticky-pause gates must not remain on history/caption effects.
    expect(panel).not.toMatch(
      /useEffect\(\(\) => \{\s*if \(nearBottomRef\.current\) \{\s*scrollRef\.current\?\.scrollTo/,
    );
    expect(panel).not.toMatch(
      /if \(nearBottomRef\.current\) scrollRef\.current\?\.scrollTo\(\{ top: scrollRef\.current\.scrollHeight \}\)/,
    );
  });
});
