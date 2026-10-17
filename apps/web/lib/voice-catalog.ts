// Locale → engine → voice for the four languages the app speaks (yue, zh, ja, en).
// Shipping path is Edge neural selected by locale + gender, then speechSynthesis.
// Kokoro / Piper / Melo / Bark stay in the map for later — weights are not in
// this repo, so they are not called. canto-tts-nano is the same: a Yue note
// only, skipped until a local build exists. NC licenses (Coqui CPML, Fish, F5)
// and the held GPU models are never selected.

export type VoiceLocale = 'yue' | 'zh' | 'ja' | 'en';
export type VoiceGender = 'female' | 'male';
export type VoiceEngine = 'edge' | 'speech' | 'kokoro' | 'piper' | 'melotts' | 'bark' | 'canto-nano';

export interface VoiceOption {
  locale: VoiceLocale;
  engine: VoiceEngine;
  gender: VoiceGender;
  /** Engine voice id, or a speechSynthesis name substring. */
  id: string;
  /** Wired into speak() today. */
  shipping: boolean;
  license: string;
  latency: 'low' | 'mid' | 'high';
  notes: string;
}

export const VOICE_CATALOG: readonly VoiceOption[] = [
  { locale: 'yue', engine: 'edge', gender: 'female', id: 'zh-HK-HiuMaanNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Default Cantonese female.' },
  { locale: 'yue', engine: 'edge', gender: 'female', id: 'zh-HK-HiuGaaiNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Brighter Cantonese female alternate.' },
  { locale: 'yue', engine: 'edge', gender: 'male', id: 'zh-HK-WanLungNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Default Cantonese male.' },
  { locale: 'yue', engine: 'speech', gender: 'female', id: 'HiuMaan', shipping: true, license: 'browser', latency: 'low', notes: 'Prefer Microsoft HiuMaan when installed.' },
  { locale: 'yue', engine: 'speech', gender: 'female', id: 'HiuGaai', shipping: true, license: 'browser', latency: 'low', notes: 'Alt Cantonese female.' },
  { locale: 'yue', engine: 'speech', gender: 'female', id: 'Sin-ji', shipping: true, license: 'browser', latency: 'low', notes: 'Apple Cantonese female.' },
  { locale: 'yue', engine: 'speech', gender: 'female', id: '粤語', shipping: true, license: 'browser', latency: 'low', notes: 'Google 粤語（香港）name match.' },
  { locale: 'yue', engine: 'speech', gender: 'male', id: 'WanLung', shipping: true, license: 'browser', latency: 'low', notes: 'Microsoft WanLung when installed.' },
  { locale: 'yue', engine: 'canto-nano', gender: 'female', id: 'canto-tts-nano', shipping: false, license: 'not bundled', latency: 'mid', notes: 'Not in repo. Yue hop after Edge zh-HK and Web Speech when a local build is added.' },
  { locale: 'yue', engine: 'canto-nano', gender: 'male', id: 'canto-tts-nano', shipping: false, license: 'not bundled', latency: 'mid', notes: 'Not in repo. Same skip as the female row.' },

  { locale: 'zh', engine: 'edge', gender: 'female', id: 'zh-CN-XiaoxiaoNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Default Mandarin female.' },
  { locale: 'zh', engine: 'edge', gender: 'male', id: 'zh-CN-YunjianNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Default Mandarin male.' },
  { locale: 'zh', engine: 'speech', gender: 'female', id: 'Xiaoxiao', shipping: true, license: 'browser', latency: 'low', notes: 'zh-CN female.' },
  { locale: 'zh', engine: 'speech', gender: 'female', id: 'Huihui', shipping: true, license: 'browser', latency: 'low', notes: 'Windows Huihui female.' },
  { locale: 'zh', engine: 'speech', gender: 'male', id: 'Yunxi', shipping: true, license: 'browser', latency: 'low', notes: 'zh-CN male.' },
  { locale: 'zh', engine: 'speech', gender: 'male', id: 'Kangkang', shipping: true, license: 'browser', latency: 'low', notes: 'Windows Kangkang male.' },
  { locale: 'zh', engine: 'melotts', gender: 'female', id: 'melotts-zh', shipping: false, license: 'MIT', latency: 'mid', notes: 'Mandarin MeloTTS. Not bundled.' },
  { locale: 'zh', engine: 'kokoro', gender: 'female', id: 'zf_xiaobei', shipping: false, license: 'Apache-2.0', latency: 'low', notes: 'Kokoro Mandarin female. Not bundled.' },
  { locale: 'zh', engine: 'kokoro', gender: 'male', id: 'zm_yunxi', shipping: false, license: 'Apache-2.0', latency: 'low', notes: 'Kokoro Mandarin male. Not bundled.' },
  { locale: 'zh', engine: 'piper', gender: 'female', id: 'zh_CN-huayan-medium', shipping: false, license: 'MIT', latency: 'low', notes: 'Piper zh_CN. Not bundled.' },

  { locale: 'ja', engine: 'edge', gender: 'female', id: 'ja-JP-NanamiNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Default Japanese female.' },
  { locale: 'ja', engine: 'edge', gender: 'male', id: 'ja-JP-KeitaNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Default Japanese male.' },
  { locale: 'ja', engine: 'speech', gender: 'female', id: 'Nanami', shipping: true, license: 'browser', latency: 'low', notes: 'ja-JP female.' },
  { locale: 'ja', engine: 'speech', gender: 'female', id: 'Kyoko', shipping: true, license: 'browser', latency: 'low', notes: 'Apple Kyoko.' },
  { locale: 'ja', engine: 'speech', gender: 'male', id: 'Keita', shipping: true, license: 'browser', latency: 'low', notes: 'ja-JP male.' },
  { locale: 'ja', engine: 'speech', gender: 'male', id: 'Otoya', shipping: true, license: 'browser', latency: 'low', notes: 'Apple Otoya male.' },
  { locale: 'ja', engine: 'melotts', gender: 'female', id: 'melotts-ja', shipping: false, license: 'MIT', latency: 'mid', notes: 'Japanese MeloTTS. Not bundled.' },
  { locale: 'ja', engine: 'piper', gender: 'female', id: 'ja_JP-natsuya-medium', shipping: false, license: 'MIT', latency: 'low', notes: 'Piper Japanese if a voice is installed. Not bundled.' },

  { locale: 'en', engine: 'edge', gender: 'female', id: 'en-US-JennyNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Default English female.' },
  { locale: 'en', engine: 'edge', gender: 'male', id: 'en-US-GuyNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Default English male.' },
  { locale: 'en', engine: 'speech', gender: 'female', id: 'Zira', shipping: true, license: 'browser', latency: 'low', notes: 'Windows Zira.' },
  { locale: 'en', engine: 'speech', gender: 'female', id: 'Samantha', shipping: true, license: 'browser', latency: 'low', notes: 'Apple Samantha.' },
  { locale: 'en', engine: 'speech', gender: 'female', id: 'Aria', shipping: true, license: 'browser', latency: 'low', notes: 'Microsoft Aria.' },
  { locale: 'en', engine: 'speech', gender: 'male', id: 'David', shipping: true, license: 'browser', latency: 'low', notes: 'Windows David. Male — do not use for female characters.' },
  { locale: 'en', engine: 'speech', gender: 'male', id: 'Mark', shipping: true, license: 'browser', latency: 'low', notes: 'Windows Mark.' },
  { locale: 'en', engine: 'speech', gender: 'male', id: 'Guy', shipping: true, license: 'browser', latency: 'low', notes: 'en-US Guy.' },
  { locale: 'en', engine: 'kokoro', gender: 'female', id: 'af_heart', shipping: false, license: 'Apache-2.0', latency: 'low', notes: 'Kokoro English female. Not bundled.' },
  { locale: 'en', engine: 'kokoro', gender: 'male', id: 'am_adam', shipping: false, license: 'Apache-2.0', latency: 'low', notes: 'Kokoro English male. Not bundled.' },
  { locale: 'en', engine: 'piper', gender: 'female', id: 'en_US-lessac-medium', shipping: false, license: 'MIT', latency: 'low', notes: 'Piper English female. Not bundled.' },
  { locale: 'en', engine: 'piper', gender: 'male', id: 'en_US-ryan-medium', shipping: false, license: 'MIT', latency: 'low', notes: 'Piper English male. Not bundled.' },
  { locale: 'en', engine: 'melotts', gender: 'female', id: 'melotts-en', shipping: false, license: 'MIT', latency: 'mid', notes: 'MeloTTS English. Not bundled.' },
  { locale: 'en', engine: 'bark', gender: 'female', id: 'v2/en_speaker_9', shipping: false, license: 'MIT', latency: 'high', notes: 'Optional only. Too slow for the live demo.' },
];

/**
 * Non-commercial checkpoints. Kept out of VOICE_CATALOG so nothing can
 * select them. Do not ship Coqui CPML, Fish Speech, or F5-TTS.
 */
export const SKIPPED_ENGINES: readonly { engine: string; license: string; notes: string }[] = [
  { engine: 'coqui', license: 'CPML', notes: 'Non-commercial. Not shipped.' },
  { engine: 'fish-speech', license: 'CC-BY-NC', notes: 'Non-commercial. Not shipped.' },
  { engine: 'f5-tts', license: 'CC-BY-NC', notes: 'Non-commercial. Not shipped.' },
];

/**
 * Research hold. Do not host these in the free wire-now path. Kokoro and
 * MeloTTS may appear above as non-shipping stubs; the others are not even
 * selectable.
 */
export const HELD_GPU_ENGINES: readonly { engine: string; notes: string }[] = [
  { engine: 'voxcpm2', notes: 'Hold for a later GPU host. Not called.' },
  { engine: 'chatterbox', notes: 'Hold for a later GPU host. Not called.' },
  { engine: 'cosyvoice', notes: 'Not in the default chain. Optional only when Settings turns the experiment on and a self-hosted CosyVoice-300M-SFT URL is saved. Weights are not bundled. See docs/COSYVOICE_SPIKE.md.' },
  { engine: 'qwen3-tts', notes: 'Hold for a later GPU host. Not called.' },
  { engine: 'kokoro', notes: 'Catalog stub only. Weights are not bundled.' },
  { engine: 'melotts', notes: 'Catalog stub only. Weights are not bundled.' },
];

/** Locale → every retained option (shipping and later), in catalog order. */
export function voicesForLocale(locale: VoiceLocale): readonly VoiceOption[] {
  return VOICE_CATALOG.filter((v) => v.locale === locale);
}

/** Personal name of an Edge short name: en-GB-RyanNeural → ryan, zh-HK-HiuMaanNeural → hiumaan. */
function voicePersonalName(id: string): string {
  return id
    .replace(/^zh-CN-(?:liaoning|shaanxi)-/i, '')
    .replace(/^[a-z]{2}-[A-Za-z]{2}-/i, '')
    .replace(/Neural$/i, '')
    .replace(/Multilingual$/i, '')
    .replace(/Expressive$/i, '')
    .toLowerCase();
}

/** Exact personal names. Substring checks treated Ryan as Yan. */
const MALE_NAMES = new Set([
  'wanlung', 'yunxi', 'yunjian', 'yunyang', 'yunxia', 'yunjhe', 'keita',
  'guy', 'christopher', 'eric', 'sam', 'otoya', 'ryan', 'andrew', 'brian',
  'steffan', 'roger', 'william', 'connor', 'prabhat', 'liam', 'mitchell',
  'wayne', 'luke', 'james', 'chilemba', 'abeo', 'elimu', 'thomas',
]);
const FEMALE_NAMES = new Set([
  'hiumaan', 'hiugaai', 'xiaoxiao', 'xiaoyi', 'xiaohan', 'xiaomo', 'xiaorui',
  'xiaobei', 'xiaoni', 'hsiaochen', 'hsiaoyu', 'nanami', 'jenny', 'aria',
  'ana', 'michelle', 'sara', 'yan', 'kyoko', 'sonia', 'libby', 'natasha',
  'neerja', 'emma', 'emily', 'ava', 'molly', 'clara', 'luna', 'leah',
  'rosa', 'maisie', 'asilia', 'ezinne', 'imani',
]);

export function isMaleNeuralVoice(id: string): boolean {
  return MALE_NAMES.has(voicePersonalName(id));
}
export function isFemaleNeuralVoice(id: string): boolean {
  return FEMALE_NAMES.has(voicePersonalName(id));
}

export function edgeVoiceId(locale: string, gender: VoiceGender): string {
  const lang = (locale === 'yue' || locale === 'zh' || locale === 'ja' || locale === 'en' ? locale : 'en') as VoiceLocale;
  const hit = VOICE_CATALOG.find((v) => v.shipping && v.engine === 'edge' && v.locale === lang && v.gender === gender);
  return hit?.id ?? (gender === 'male' ? 'en-US-GuyNeural' : 'en-US-JennyNeural');
}

/** speechSynthesis name substrings, best first, for this locale and gender. */
export function synthNameList(locale: string, gender: VoiceGender): string[] {
  const lang = (locale === 'yue' || locale === 'zh' || locale === 'ja' || locale === 'en' ? locale : 'en') as VoiceLocale;
  const names = VOICE_CATALOG
    .filter((v) => v.shipping && v.engine === 'speech' && v.locale === lang && v.gender === gender)
    .map((v) => v.id);
  names.push(gender === 'female' ? 'Female' : 'Male');
  return names;
}

/** Browser voices whose names read as the opposite gender (Windows David has no "Male" in the name). */
export function synthNameConflicts(gender: VoiceGender, voiceName: string): boolean {
  const male = /male|wanlung|yunxi|yunjian|yunyang|keita|otoya|kangkang|david|mark|george|guy|daniel|christopher|eric|james|ryan/i;
  const female = /female|hiumaan|hiugaai|sin-ji|xiaoxiao|xiaoyi|huihui|yaoyao|nanami|kyoko|haruka|zira|samantha|aria|jenny|hazel|susan/i;
  if (gender === 'female') return male.test(voiceName) && !female.test(voiceName);
  return female.test(voiceName) && !male.test(voiceName);
}
