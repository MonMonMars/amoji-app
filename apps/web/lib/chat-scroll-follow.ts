/**
 * Chat history follow-live scroll.
 *
 * Owner policy: when new talking / live captions / history lines appear,
 * always jump to the bottom — even if the user had scrolled up. Do not
 * pause follow while scrolled away (no sticky-pause).
 */

export function shouldFollowLiveChat(_scrolledAway = false): boolean {
  return true;
}

/** Jump the chat history pane so the newest line + live caption stay visible. */
export function scrollChatHistoryToLatest(
  el: { scrollHeight: number; scrollTop: number; scrollTo?: HTMLElement['scrollTo'] } | null | undefined,
): void {
  if (!el) return;
  const top = el.scrollHeight;
  if (typeof el.scrollTo === 'function') {
    el.scrollTo({ top });
    return;
  }
  el.scrollTop = top;
}
