import type { Lang } from './prefs';

const FOLLOW: Record<Lang, string> = {
  yue: '你覺得點呀？',
  zh: '你觉得呢？',
  ja: 'どう思う？',
  en: 'What do you think?',
};

/** Keep the chat going: if a reply has no question yet, add one in the UI language. */
export function withQuestion(reply: string, lang?: string): string {
  const text = reply.trim();
  if (!text) return reply;
  if (/[?？]/.test(text)) return text;
  const q = FOLLOW[(lang as Lang) ?? 'yue'] ?? FOLLOW.yue;
  return `${text} ${q}`;
}
