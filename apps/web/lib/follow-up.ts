import type { Lang } from './prefs';

// The closing question is the continuity rule: a reply that ends flat gives the
// user nothing to answer, and the chat dies. The model is told to write its own
// on-topic question; this is the safety net for when it forgets.
//
// The bank is deliberately OPEN questions — they work after any reply, and they
// beat the old single "你覺得點呀？/ What do you think?", which is exactly the
// content-free prompt the user complained about ("sounds nonsense"). Pick is
// deterministic so tests and repeated turns stay stable.
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

/** Keep the chat going: if a reply has no question yet, add one in the UI
 *  language. A reply that already asks something, or that is a goodbye, is
 *  left exactly as written. */
export function withQuestion(reply: string, lang?: string): string {
  const text = reply.trim();
  if (!text) return reply;
  if (/[?？]/.test(text)) return text;
  if (FAREWELL_RE.test(text)) return text;
  const options = bank(lang);
  // Rotate on the reply's length so consecutive turns do not repeat a line,
  // while the same reply always gets the same question (tests, replays).
  const q = options[text.length % options.length] ?? options[0]!;
  return `${text} ${q}`;
}
