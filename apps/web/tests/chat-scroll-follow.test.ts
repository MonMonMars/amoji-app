import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
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
    expect(scrollTo).toHaveBeenCalledWith({ top: 900 });
  });

  it('scrollChatHistoryToLatest no-ops on null and falls back without scrollTo', () => {
    expect(() => scrollChatHistoryToLatest(null)).not.toThrow();
    const el = { scrollHeight: 400, scrollTop: 12 };
    scrollChatHistoryToLatest(el);
    expect(el.scrollTop).toBe(400);
  });

  it('ChatPanel forces follow on history + caption updates (no nearBottom gate)', () => {
    const panel = read('components/ChatPanel.tsx');
    expect(panel).toContain('scrollChatHistoryToLatest');
    expect(panel).toContain('shouldFollowLiveChat');
    // Old sticky-pause gates must not remain on history/caption effects.
    expect(panel).not.toMatch(
      /useEffect\(\(\) => \{\s*if \(nearBottomRef\.current\) \{\s*scrollRef\.current\?\.scrollTo/,
    );
    expect(panel).not.toMatch(
      /if \(nearBottomRef\.current\) scrollRef\.current\?\.scrollTo\(\{ top: scrollRef\.current\.scrollHeight \}\)/,
    );
  });
});
