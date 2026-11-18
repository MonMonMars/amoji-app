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
    yue: '功夫講「禮貌先於拳」——傳統上師父先教抱拳禮，再教馬步同冲拳。文中師傅練呢啲招；等我個身準備好再打俾你睇。',
    zh: '功夫讲究「礼先于拳」——传统师父先教抱拳礼，再教马步和冲拳。故事里的师傅练那些招式；等我的身体准备好再示范给你看。',
    ja: 'カンフーは「礼が先、拳が後」——師匠は先に抱拳礼を教え、それから馬歩や突きを教える。物語の師匠が型を練ぶ話；体の準備ができたら見せるね。',
    en: 'Kung fu is "manners before fists" — masters teach the salute, then horse stance and strikes. The tale is about how they train; when my body’s ready I’ll show you the form.',
  },
  taichi: {
    yue: '太極拳講「以柔克剛」——起勢、雲手都係慢慢搵圓嘅勁。好多練家咁郁；我跟住段音樂唞住講，等動作出嚟同步。',
    zh: '太极拳讲「以柔克刚」——起势、云手都是慢慢找圆的劲。许多练家那样动；我先跟着音乐边讲边等你看到动作同步。',
    ja: '太極拳は「柔で剛に克つ」——起勢や雲手はゆっくり円の勁を探す。多くの練習者がそう動く；動きが出るまで音に合わせて説明するね。',
    en: 'Tai chi is "soft overcomes hard" — opening and cloud hands trace slow circles. That’s how practitioners move; I’ll explain to the music until the motion can sync.',
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
