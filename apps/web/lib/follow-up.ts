import type { Lang } from './prefs';

// Privacy-first: do not tack on a generic follow-up question in code. The
// companion may ask something only when it naturally fits the user's message;
// empty "tell me more" prompts are worse than a short statement.
//
// The bank remains for deterministic tests / opt-in callers that pass
// `forceFollowUp: true` (not used in the default chat path).
const FOLLOW: Record<Lang, readonly string[]> = {
  yue: [
    '咁你呢？',
    '想唔想講多啲俾我聽？',
    '你嗰邊而家點呀？',
  ],
  zh: [
    '那你呢？',
    '想不想再多说一点？',
    '你那边现在怎么样？',
  ],
  ja: [
    'そっちはどう？',
    'もうちょっと聞かせて？',
    '今、どんな感じ？',
  ],
  en: [
    'What about you?',
    'Want to tell me a bit more?',
    'How is it on your end right now?',
  ],
};

/** A farewell already closed the turn — appending "what about you?" after it
 *  reads like she was not listening. */
const FAREWELL_RE = /(?:^|[\s，,。.!！])(?:bye|goodbye|good night|goodnight|see you|talk later|i'?m off|goodbye for now|拜拜|再見|再见|我走先|唔講住|晚安|おやすみ|じゃあね|またね)(?:[\s，,。.!！~～]|$)/i;

function bank(lang?: string): readonly string[] {
  const key = (lang as Lang) ?? 'yue';
  return FOLLOW[key] ?? FOLLOW.yue;
}

export type WithQuestionOpts = { forceFollowUp?: boolean };

/** By default returns the reply unchanged (privacy — no automatic fishing). */
export function withQuestion(reply: string, lang?: string, opts?: WithQuestionOpts): string {
  const text = reply.trim();
  if (!text || !opts?.forceFollowUp) return reply;
  if (/[?？]/.test(text)) return text;
  if (FAREWELL_RE.test(text)) return text;
  const options = bank(lang);
  const q = options[text.length % options.length] ?? options[0]!;
  return `${text} ${q}`;
}
