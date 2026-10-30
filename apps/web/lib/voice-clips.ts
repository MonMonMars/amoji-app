// Short greeting and emotion clips.
// Laugh / smile / giggle / wow / um / oh / ha are recorded human bursts
// (public/voice-clips/CREDITS.md). Live TTS must not synthesize those leads.
// Hello, nice-to-meet-you, hi-hi, my-pleasure, and the longer
// "let me think / let me search" lines stay spoken clips.
// Files: public/voice-clips/{yue|zh|ja|en}/{female|male}/{kind}.mp3
// Spoken lines only: apps/web/scripts/gen-voice-clips.py
// Sources and licenses: public/voice-clips/ATTRIBUTION.md
// The mapped library also keeps extra takes (anime laughs, sighs) and a
// universal/ folder. Chat leads still use the seven canonical names.

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

export const CLIP_FOLDERS = ['yue', 'zh', 'ja', 'en', 'universal'] as const;
export type ClipFolder = (typeof CLIP_FOLDERS)[number];

/** Preview list for the select board. Canonical seven first, then extra takes. */
export const CLIP_LIBRARY = {
  yue: {
    female: ['laugh.mp3', 'smile.mp3', 'giggle.mp3', 'wow.mp3', 'um.mp3', 'oh.mp3', 'ha.mp3'],
    male: ['laugh.mp3', 'smile.mp3', 'giggle.mp3', 'wow.mp3', 'um.mp3', 'oh.mp3', 'ha.mp3'],
  },
  zh: {
    female: ['laugh.mp3', 'smile.mp3', 'giggle.mp3', 'wow.mp3', 'um.mp3', 'oh.mp3', 'ha.mp3', 'giggle_craig.mp3'],
    male: ['laugh.mp3', 'smile.mp3', 'giggle.mp3', 'wow.mp3', 'um.mp3', 'oh.mp3', 'ha.mp3'],
  },
  ja: {
    female: ['laugh.mp3', 'smile.mp3', 'giggle.mp3', 'wow.mp3', 'um.mp3', 'oh.mp3', 'ha.mp3', 'giggle_anime1.mp3', 'ha_anime.mp3', 'laugh_anime1.mp3', 'laugh_anime2.mp3', 'laugh_tts.mp3', 'oh_anime.mp3', 'oh_rpg.mp3', 'sigh.mp3', 'um_tts.mp3', 'wow_tts.mp3'],
    male: ['laugh.mp3', 'smile.mp3', 'giggle.mp3', 'wow.mp3', 'um.mp3', 'oh.mp3', 'ha.mp3'],
  },
  en: {
    female: ['laugh.mp3', 'smile.mp3', 'giggle.mp3', 'wow.mp3', 'um.mp3', 'oh.mp3', 'ha.mp3', 'laugh_oga.mp3', 'laugh_reitanna.mp3', 'wow_alt.mp3', 'wow_mixkit.mp3'],
    male: ['laugh.mp3', 'smile.mp3', 'giggle.mp3', 'wow.mp3', 'um.mp3', 'oh.mp3', 'ha.mp3', 'ha_effort.mp3', 'oh_tts.mp3', 'sigh.mp3', 'um_tts.mp3', 'wow_tts.mp3', 'wow_woven.mp3'],
  },
  universal: {
    female: ['laugh.mp3', 'smile.mp3', 'giggle.mp3', 'wow.mp3', 'um.mp3', 'oh.mp3', 'ha.mp3', 'giggle_en.mp3', 'giggle_group.mp3', 'ha_rpg.mp3', 'hehe.mp3', 'huh.mp3', 'laugh_anime.mp3', 'sigh.mp3', 'wow_mixkit.mp3', 'wow_reitanna.mp3', 'wow_woven.mp3'],
    male: ['laugh.mp3', 'wow.mp3', 'oh.mp3', 'ha.mp3', 'sigh.mp3'],
  },
} as const;

export function clipLibraryFile(folder: ClipFolder, gender: VoiceClipGender, file: string): string | null {
  const list = CLIP_LIBRARY[folder][gender] as readonly string[];
  if (!list.includes(file)) return null;
  return `/voice-clips/${folder}/${gender}/${file}`;
}

export interface ClipLibraryEntry {
  /** 1-based index in CLIP_LIBRARY flatten order (yue→zh→ja→en→universal × F→M). */
  id: number;
  folder: ClipFolder;
  gender: VoiceClipGender;
  file: string;
  path: string;
}

/** Flatten CLIP_LIBRARY in SoT order. SFX numbers use this, not filesystem sort. */
export function listClipLibrary(): ClipLibraryEntry[] {
  const out: ClipLibraryEntry[] = [];
  let id = 1;
  for (const folder of CLIP_FOLDERS) {
    for (const gender of VOICE_CLIP_GENDERS) {
      for (const file of CLIP_LIBRARY[folder][gender] as readonly string[]) {
        out.push({
          id,
          folder,
          gender,
          file,
          path: `/voice-clips/${folder}/${gender}/${file}`,
        });
        id += 1;
      }
    }
  }
  return out;
}

const CLIP_BY_PATH = new Map(listClipLibrary().map((e) => [e.path, e]));

/** CLIP_LIBRARY # for a path, or null if the file is outside the library. */
export function clipLibraryId(path: string): number | null {
  return CLIP_BY_PATH.get(path)?.id ?? null;
}

/** Path for CLIP_LIBRARY #N (1–99), or null. */
export function clipLibraryPath(id: number): string | null {
  if (!Number.isInteger(id) || id < 1) return null;
  return listClipLibrary()[id - 1]?.path ?? null;
}

/** CLIP_LIBRARY # for a folder/gender/file row shown in the select board. */
export function clipLibraryIdFor(folder: ClipFolder, gender: VoiceClipGender, file: string): number | null {
  return clipLibraryId(`/voice-clips/${folder}/${gender}/${file}`);
}

/** laugh.mp3 and laugh_anime.mp3 both belong to laugh. hehe → giggle, huh → um. */
export function emotionKindForFile(file: string): BurstClipKind | 'sigh' | null {
  const stem = file.replace(/\.mp3$/i, '').toLowerCase();
  if (stem === 'hehe' || stem.startsWith('hehe_')) return 'giggle';
  if (stem === 'huh' || stem.startsWith('huh_')) return 'um';
  if (stem === 'sigh' || stem.startsWith('sigh_')) return 'sigh';
  for (const kind of BURST_CLIP_KINDS) {
    if (stem === kind || stem.startsWith(`${kind}_`)) return kind;
  }
  return null;
}

/** Visible pill text. Takes stay distinct; nothing is labeled only "Universal". */
export function clipButtonLabel(lang: string, file: string): string {
  const stem = file.replace(/\.mp3$/i, '');
  const kind = emotionKindForFile(file);
  const burst = kind && (BURST_CLIP_KINDS as readonly string[]).includes(kind)
    ? BURST_CLIP_LABEL[clipLang(lang)][kind as BurstClipKind]
    : null;
  if (burst && stem.toLowerCase() === kind) return burst;
  if (burst) {
    const take = stem.replace(new RegExp(`^${kind}_`, 'i'), '').replace(/_/g, ' ');
    return take ? `${burst} · ${take}` : burst;
  }
  if (kind === 'sigh') {
    const take = stem.replace(/^sigh_?/i, '').replace(/_/g, ' ');
    return take ? `Sigh · ${take}` : 'Sigh';
  }
  return stem.replace(/_/g, ' ');
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

/**
 * Short um… fillers matched by gender + chat language.
 * Yue F = CLIP #5, Yue M = CLIP #12. Other langs use that lang's um.mp3.
 * Think / search stay short um / huh bursts — never the long thinking.wav.
 */
function langUmPath(lang: string, gender: VoiceClipGender): string {
  const folder = clipLang(lang);
  const path = `/voice-clips/${folder}/${gender}/um.mp3`;
  if (clipLibraryId(path) !== null) return path;
  return gender === 'female'
    ? '/voice-clips/universal/female/um.mp3'
    : '/voice-clips/ja/male/um.mp3';
}

function langHaPath(lang: string, gender: VoiceClipGender): string {
  const folder = clipLang(lang);
  const path = `/voice-clips/${folder}/${gender}/ha.mp3`;
  if (clipLibraryId(path) !== null) return path;
  return gender === 'female'
    ? '/voice-clips/universal/female/ha.mp3'
    : '/voice-clips/en/male/ha.mp3';
}

/** Recorded hit for a poke. Female = CLIP #94 wow_woven; Male = CLIP #52 ja/male/oh. */
const RECORDED_POKE: Record<VoiceClipGender, string> = {
  female: '/voice-clips/universal/female/wow_woven.mp3',
  male: '/voice-clips/ja/male/oh.mp3',
};

export function recordedFillerClip(
  gender: VoiceClipGender,
  kind: 'um' | 'ha' | 'think' | 'search',
  lang: string = 'yue',
): string {
  if (kind === 'ha') return langHaPath(lang, gender);
  if (kind === 'search' && gender === 'female') {
    const huh = '/voice-clips/universal/female/huh.mp3';
    if (clipLibraryId(huh) !== null) return huh;
  }
  return langUmPath(lang, gender);
}

export function recordedPokeClip(gender: VoiceClipGender): string {
  return RECORDED_POKE[gender];
}

export function loadingFillerKind(text: string): 'um' | 'ha' | 'think' | 'search' | null {
  const kind = emotionClipKind(text, 'line');
  if (kind === 'um' || kind === 'ha' || kind === 'think' || kind === 'search') return kind;
  return null;
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
