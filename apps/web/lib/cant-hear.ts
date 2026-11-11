// Local intercept when the user says they cannot hear her voice / story.
// Do NOT send these turns to the LLM — weak models invent nonsense story
// continuations ("軍艦開到極光") instead of fixing audio.

import type { Lang } from './prefs';

const CANT_HEAR_RE =
  /聽唔到|听不到|聽不見|听不见|聽唔清|听不清|冇聲|没声|沒聲|沒有聲音|没有声音|聽唔到你|听不到你|can't\s+hear|cannot\s+hear|couldn'?t\s+hear|can\s+not\s+hear|no\s+sound|too\s+quiet|聞こえない|聞き取れない|音がしない/i;

export function isCantHearComplaint(text: string): boolean {
  const t = (text ?? '').trim();
  if (!t) return false;
  return CANT_HEAR_RE.test(t);
}

const REPLY: Record<Lang, string> = {
  en: "Sorry — you couldn't hear me. Check the silent switch and volume, then I'll say it again more clearly.",
  yue: '對唔住呀，你聽唔到。睇吓靜音掣同音量，我而家再清楚講多次。',
  zh: '对不起，你听不到。先看看静音开关和音量，我现在再清楚说一次。',
  ja: 'ごめん、聞こえなかったね。サイレントスイッチと音量を確認して、もう一度はっきり言うね。',
};

/** Short spoken fix — offer a clearer re-say, never invent a new story beat. */
export function cantHearReply(lang: Lang): string {
  return REPLY[lang] ?? REPLY.en;
}
