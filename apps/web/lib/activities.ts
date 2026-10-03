// r2026-10-04.42: "together" activities — sing a duet with her, share a meal.
// These are triggers + spoken lines only; the heavy lifting (singing, body
// language, toasts riding on the reply) is wired in ChatPanel. Every line
// ends with a question or invitation so the moment never dies mid-air.

export type ActLang = 'yue' | 'zh' | 'ja' | 'en';

/** "sing WITH me" — must NOT fire on plain "sing a song for me" requests */
export const DUET_TRIGGER = /(一齊唱歌|一齐唱歌|一齊唱|一齐唱|陪我唱|同我唱|合唱|sing with me|sing along|duet|一緒に歌|デュエット)/i;

/** the user wants out of whatever together-mode is running */
export const QUIT_RE = /(唔玩|不玩|唔唱|不唱|停止|退出|stop|quit|やめ)/i;

/** "eat WITH me" — dinner together, not "I'm hungry, talk about food" */
export const MEAL_TOGETHER_TRIGGER = /(一齊食|一齐食|陪我食|陪我吃|同我食|食飯喇|开饭|開餐|eat with me|have dinner with me|dinner together|一緒に食|ごはん一緒)/i;

const DUET_INVITE: Record<ActLang, string> = {
  yue: '好呀好呀！你唱一段，我幫你和音——你起句啦？',
  zh: '好呀好呀！你唱一段，我来和声——你起个头吧？',
  ja: 'いいね！君が歌って、僕がハモるよ——最初のひとつ、どうぞ？',
  en: "Yes, let's duet! You take the melody, I'll harmonize — you start us off?",
};

const DUET_GOODBYE: Record<ActLang, string> = {
  yue: '好開心呀今日！下次再一齊唱過？',
  zh: '今天唱得好开心！下次再一起唱？',
  ja: '今日は楽しかった！また一緒に歌おう？',
  en: 'That was so fun! Same time next duet?',
};

const MEAL_TOASTS: Record<ActLang, string[]> = {
  yue: ['乾杯！', '好味吖！', '慢慢食，唔使急。', '呢餐我請～'],
  zh: ['干杯！', '好好吃呀！', '慢慢吃，不着急。', '这顿我请～'],
  ja: ['乾杯！', 'おいしいね！', 'ゆっくり食べよう。', '今日は僕のおごり〜'],
  en: ["Cheers!", 'So good, right?', 'Slow down, no rush.', "This one's on me~"],
};

export function duetInviteLine(lang: ActLang): string {
  return DUET_INVITE[lang] ?? DUET_INVITE.en;
}

export function duetGoodbyeLine(lang: ActLang): string {
  return DUET_GOODBYE[lang] ?? DUET_GOODBYE.en;
}

/** the little toast she raises while the meal reply is spoken — rotates by n */
export function pickMealToast(lang: ActLang, n: number): string {
  const bank = MEAL_TOASTS[lang] ?? MEAL_TOASTS.en;
  return bank[Math.abs(n) % bank.length]!;
}
