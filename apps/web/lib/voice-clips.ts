// Short greeting and emotion clips.
// Laugh / smile / giggle / wow / um / oh / ha are recorded human bursts
// (public/voice-clips/CREDITS.md). Live TTS must not synthesize those leads.
// Hello, nice-to-meet-you, hi-hi, my-pleasure, and the longer
// "let me think / let me search" lines stay spoken clips.
// Files: public/voice-clips/{yue|zh|ja|en}/{female|male}/{kind}.mp3
// Spoken lines only: apps/web/scripts/gen-voice-clips.py
// Sources and licenses: public/voice-clips/ATTRIBUTION.txt
// en/ is Nox plus Reitanna and 1LOVE. zh/ laughs and sighs are VocalSound.
// ja/ uses Nox game-style bursts plus Mixkit gasps (VocalSound has no Japanese speakers).
// yue/ is an Edge crop (HiuMaan / WanLung). No free Cantonese pack exists.

export const VOICE_CLIP_LANGS = ['yue', 'zh', 'ja', 'en'] as const;
export type VoiceClipLang = (typeof VOICE_CLIP_LANGS)[number];
export const VOICE_CLIP_GENDERS = ['female', 'male'] as const;
export type VoiceClipGender = (typeof VOICE_CLIP_GENDERS)[number];

/** Recorded vocal bursts. These replace live TTS of the same sounds. */
export const BURST_CLIP_KINDS = ['laugh', 'smile', 'giggle', 'wow', 'um', 'oh', 'ha'] as const;
export type BurstClipKind = (typeof BURST_CLIP_KINDS)[number];
/** Vocal bursts plus the longer loading lines. */
export const EMOTION_CLIP_KINDS = [...BURST_CLIP_KINDS, 'think', 'search'] as const;
/** Lines played when a character or a TTS button is pressed. Rotates. */
export const GREETING_CLIP_KINDS = ['hello', 'nice', 'hihi', 'pleasure'] as const;
export const VOICE_CLIP_KINDS = [...EMOTION_CLIP_KINDS, ...GREETING_CLIP_KINDS] as const;
export type EmotionClipKind = (typeof EMOTION_CLIP_KINDS)[number];
export type GreetingClipKind = (typeof GREETING_CLIP_KINDS)[number];
export type VoiceClipKind = (typeof VOICE_CLIP_KINDS)[number];

export const GREETING_TEXT: Record<VoiceClipLang, Record<GreetingClipKind, string>> = {
  en: {
    hello: 'Hello!',
    nice: 'Nice to meet you.',
    hihi: 'Hi hi!',
    pleasure: 'My pleasure.',
  },
  yue: {
    hello: '你好！',
    nice: '好開心認識你。',
    hihi: '嗨嗨！',
    pleasure: '唔使客氣。',
  },
  zh: {
    hello: '你好！',
    nice: '很高兴认识你。',
    hihi: '嗨嗨！',
    pleasure: '不客气。',
  },
  ja: {
    hello: 'こんにちは！',
    nice: 'はじめまして。',
    hihi: 'やあやあ！',
    pleasure: 'どういたしまして。',
  },
};

/** Longer loading lines. Short waits stay on um / ha. */
export const FILLER_CLIP_TEXT: Record<VoiceClipLang, { think: string; search: string }> = {
  en: { think: 'um…… let me think.', search: 'um…… let me search the web.' },
  yue: { think: '嗯……等我諗下。', search: '嗯……等我上網搵下。' },
  zh: { think: '嗯……让我想想。', search: '嗯……让我上网查一下。' },
  ja: { think: 'うーん……考えさせて。', search: 'うーん……ネットで調べるね。' },
};

/** True for laugh / smile / giggle / wow / um / oh / ha. Think and search stay sentences. */
export function burstSkipsTts(kind: EmotionClipKind | null): boolean {
  return kind !== null && (BURST_CLIP_KINDS as readonly string[]).includes(kind);
}

export const BURST_CLIP_LABEL: Record<VoiceClipLang, Record<BurstClipKind, string>> = {
  en: { laugh: 'Laugh', smile: 'Smile', giggle: 'Giggle', wow: 'Wow', um: 'Um', oh: 'Oh', ha: 'Ha' },
  yue: { laugh: '大笑', smile: '微笑', giggle: '嘻嘻', wow: '哇', um: '嗯', oh: '哦', ha: '哈' },
  zh: { laugh: '大笑', smile: '微笑', giggle: '嘻嘻', wow: '哇', um: '嗯', oh: '哦', ha: '哈' },
  ja: { laugh: '笑', smile: 'ふふ', giggle: 'くすくす', wow: 'わあ', um: 'うん', oh: 'あっ', ha: 'はあ' },
};

export function clipLang(lang: string): VoiceClipLang {
  if (lang === 'yue' || lang === 'zh' || lang === 'ja' || lang === 'en') return lang;
  return 'en';
}

export function clipFile(lang: string, gender: VoiceClipGender, kind: VoiceClipKind): string {
  return `/voice-clips/${clipLang(lang)}/${gender}/${kind}.mp3`;
}

export function greetingText(lang: string, kind: GreetingClipKind): string {
  return GREETING_TEXT[clipLang(lang)][kind];
}

let greetCursor = 0;

/** hello → nice to meet you → hi hi → my pleasure, then repeat. */
export function nextGreetingKind(): GreetingClipKind {
  const kind = GREETING_CLIP_KINDS[greetCursor % GREETING_CLIP_KINDS.length]!;
  greetCursor += 1;
  return kind;
}

export function resetGreetingRotation(): void {
  greetCursor = 0;
}

function compact(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/gi, '');
}

/** The whole string is only a vocalization, not a sentence that mentions one. */
function onoKind(token: string): EmotionClipKind | null {
  if (!token || token.length > 16) return null;
  if (/^(wow+|ooh+|wah*|哇+|わあ|わー|哇哦)$/.test(token)) return 'wow';
  if (/^(te?ehee|hehe+|giggle|嘻嘻|へへ|ふふっ?|えへへ?)$/.test(token)) return 'giggle';
  if (/^(heh+|呵呵|ふっ?|呵+)$/.test(token)) return 'smile';
  if (/^(bahaha|hahaha+|haha+|hoho+|lol+|哈哈+|あはは+っ?|ははは?っ?|がはは+っ?)$/.test(token)) return 'laugh';
  if (/^(um+|uh+|hmm+|mmm+|嗯+|えっと+|えーと|あの+|うん+|うーん+)$/.test(token)) return 'um';
  if (/^(oh+|ohgosh|aww+|哎呀|あら|えっ|咦|诶|欸)$/.test(token)) return 'oh';
  if (/^(ha+|哈+|はあ|はぁ)$/.test(token)) return 'ha';
  return null;
}

/**
 * Which clip replaces TTS for this string.
 * `line` — the whole utterance (loading fillers, a bare laugh). A normal
 * sentence stays null so chat replies are not swallowed.
 * `lead` — the vocal tic in front of a reply (laugh / giggle / wow / um / oh).
 */
export function emotionClipKind(text: string, role: 'lead' | 'line'): EmotionClipKind | null {
  const raw = text.trim();
  if (!raw) return null;
  const token = compact(raw);
  if (token.length > 0 && token.length <= 24 && /letmethink|諗下|想想|考えさせ/.test(token)) return 'think';
  if (token.length > 0 && token.length <= 32 && /letmesearch|searchtheweb|上網|上网|調べ/.test(token)) return 'search';
  const ono = onoKind(token);
  if (ono) return ono;
  if (role === 'line') return null;
  const s = raw.toLowerCase();
  if (/hehe|teehee|giggle|嘻嘻|ふふ|えへ|へへ/.test(s)) return 'giggle';
  if (/haha|bahaha|\blol\b|哈哈|あはは|はは|がはは|笑死|好笑|^ha\b/.test(s)) return 'laugh';
  if (/呵呵|\bheh\b|\bfunny\b|呵/.test(s)) return 'smile';
  if (/wow|ooh|哇|わあ|わー/.test(s)) return 'wow';
  if (/\bum+\b|\buh+\b|\bhmm+\b|嗯|えっと|うん|あの/.test(s)) return 'um';
  if (/\boh\b|oh gosh|\baww+\b|哎呀|あら|えっ|咦|诶/.test(s)) return 'oh';
  if (/^哈/.test(raw) || /^は/.test(raw)) return 'ha';
  if (/^ふ/.test(raw)) return 'smile';
  return null;
}
