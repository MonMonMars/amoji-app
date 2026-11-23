// Martial demo guard — only narrate "I do X" when lib_C120 / lib_C121 is loaded
// and the canvas will play it. Otherwise short third-person theory / history.
import type { ExLang } from './exercises';
import type { MoveKind } from './moves';

export type MartialFlowKind = 'kungfu' | 'taichi';

export const MARTIAL_FLOW_CLIP: Readonly<Record<MartialFlowKind, string>> = {
  kungfu: 'lib_C120',
  taichi: 'lib_C121',
};

/** Target speak window aligned with looping martial VRMA (ms). */
export const MARTIAL_FLOW_SPEAK_MS = 7200;

const loadedClips = new Set<string>();

export function markMartialFlowClipLoaded(clipId: string): void {
  if (clipId === MARTIAL_FLOW_CLIP.kungfu || clipId === MARTIAL_FLOW_CLIP.taichi) {
    loadedClips.add(clipId);
  }
}

export function resetMartialFlowClipsForTests(): void {
  loadedClips.clear();
}

export function martialFlowClipArmed(kind: MartialFlowKind): boolean {
  return loadedClips.has(MARTIAL_FLOW_CLIP[kind]);
}

export interface MartialFlowDemoTurn {
  line: string;
  move: MoveKind;
  speakMs: number;
  performMode: boolean;
}

const PERFORM: Record<MartialFlowKind, Record<ExLang, string>> = {
  kungfu: {
    yue: '好，我而家打一段功夫招式——跟住節奏睇，你都得㗎！',
    zh: '好，我现在打一段功夫招式——跟着节奏看，你也可以的！',
    ja: 'よし、いまカンフーの型をいっとう——リズムについていって、君にもできるよ！',
    en: 'Alright — I’ll run a kung fu form now. Watch the rhythm; you can try it too!',
  },
  taichi: {
    yue: '好，一齊打一段太極——慢慢嚟，跟住呼吸就得，你好叻㗎！',
    zh: '好，一起打一段太极——慢慢来，呼吸跟上就好，你很棒！',
    ja: 'よし、一緒に太極をひと流れ——ゆっくりでいいよ、呼吸に合わせて。上手だね！',
    en: 'Alright — let’s flow through some tai chi together. Nice and easy, breathe with me. You’re doing great!',
  },
};

const THEORY: Record<MartialFlowKind, Record<ExLang, string>> = {
  kungfu: {
    yue: '功夫講「禮貌先於拳」——傳統上師父先教抱拳禮，再教馬步同冲拳。呢啲都係基本功，練多咗身體自然記得。',
    zh: '功夫讲究「礼先于拳」——传统师父先教抱拳礼，再教马步和冲拳。这些都是基本功，练多了身体自然记得。',
    ja: 'カンフーは「礼が先、拳が後」——師匠は先に抱拳礼を教え、それから馬歩や突きを教える。どれも基本の型で、重ねるうちに体が覚えていくよ。',
    en: 'Kung fu is "manners before fists": masters teach the salute first, then horse stance and strikes. Those are the basics, and repetition teaches the body.',
  },
  taichi: {
    yue: '太極拳講「以柔克剛」——起勢、雲手都係慢慢搵圓嘅勁，動作越慢越見功夫。',
    zh: '太极拳讲「以柔克刚」——起势、云手都是慢慢找圆的劲，动作越慢越见功夫。',
    ja: '太極拳は「柔で剛に克つ」——起勢や雲手はゆっくり円の勁を探す動きで、ゆっくりなほど功夫が見えるんだ。',
    en: 'Tai chi is "soft overcomes hard": the opening and cloud hands trace slow circles, and the slower the motion, the more control it shows.',
  },
};

export function martialFlowDemoTurn(kind: MartialFlowKind, lang: ExLang): MartialFlowDemoTurn {
  const armed = martialFlowClipArmed(kind);
  const table = armed ? PERFORM : THEORY;
  return {
    line: table[kind][lang] ?? table[kind].en,
    move: kind,
    speakMs: armed ? MARTIAL_FLOW_SPEAK_MS : Math.min(MARTIAL_FLOW_SPEAK_MS, 5200),
    performMode: armed,
  };
}

const FIRST_PERSON_MOVE_RE =
  /(?:我|俺|僕|わたし)[^。！？.!?\n]{0,24}(?:打|踢|冲|擊|击|拳|抬|舉|举|蹲|馬步|马步|起勢|起势|雲手|云手|一招|一式)/u;

export function scrubUnsyncedMartialProse(
  text: string,
  kind: MartialFlowKind | null,
  armed: boolean,
  lang: ExLang = 'en',
): string {
  if (!kind || armed || !text.trim()) return text;
  if (!FIRST_PERSON_MOVE_RE.test(text)) return text;
  return THEORY[kind][lang] ?? THEORY[kind].en;
}

export function martialLlmSystemAppendix(kind: MartialFlowKind, armed: boolean, yue: boolean): string {
  if (armed) {
    return yue
      ? `- 武術示範（${kind}）：VRMA 會同步播放；最多兩句，講「跟住睇／一齊試」，唔好逐招長篇「我出拳、我馬步」。`
      : `- Martial demo (${kind}): VRMA plays in sync — at most two short sentences; invite them to watch/try. No long move-by-move "I punch / I horse-stance" monologue.`;
  }
  return yue
    ? `- 武術（${kind}）而家未播動作：只講歷史、道理、其他人點練（第三人稱）；禁止「我而家出拳／我示范馬步」等第一人稱動作描述。最多三句。`
    : `- Martial (${kind}) with no body clip yet: teach theory/history/how others practice (third person). Never "I am throwing a punch now" — max three sentences.`;
}
