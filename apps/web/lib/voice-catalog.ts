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
  { locale: 'zh', engine: 'edge', gender: 'female', id: 'zh-CN-XiaoyiNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Second Mandarin female.' },
  { locale: 'zh', engine: 'edge', gender: 'male', id: 'zh-CN-YunjianNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Default Mandarin male.' },
  { locale: 'zh', engine: 'edge', gender: 'male', id: 'zh-CN-YunxiNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Mandarin male peer.' },
  { locale: 'zh', engine: 'edge', gender: 'male', id: 'zh-CN-YunyangNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Mandarin male, clearer enunciation.' },
  { locale: 'zh', engine: 'edge', gender: 'male', id: 'zh-CN-YunxiaNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Mandarin male, cartoon/cute. Listed for the bake-off.' },
  { locale: 'zh', engine: 'edge', gender: 'male', id: 'zh-TW-YunJheNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Taiwan Mandarin male.' },
  { locale: 'zh', engine: 'edge', gender: 'female', id: 'zh-TW-HsiaoChenNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Taiwan Mandarin female.' },
  { locale: 'zh', engine: 'edge', gender: 'female', id: 'zh-TW-HsiaoYuNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Taiwan Mandarin female peer.' },
  { locale: 'zh', engine: 'edge', gender: 'female', id: 'zh-CN-liaoning-XiaobeiNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Liaoning female. Distinct from Xiaoxiao.' },
  { locale: 'zh', engine: 'edge', gender: 'female', id: 'zh-CN-shaanxi-XiaoniNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Shaanxi female. Distinct from Xiaoyi.' },
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
  { locale: 'en', engine: 'edge', gender: 'male', id: 'en-US-AndrewNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'English male peer.' },
  { locale: 'en', engine: 'edge', gender: 'male', id: 'en-US-BrianNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'English male peer.' },
  { locale: 'en', engine: 'edge', gender: 'male', id: 'en-US-ChristopherNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'English male.' },
  { locale: 'en', engine: 'edge', gender: 'male', id: 'en-US-EricNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'English male.' },
  { locale: 'en', engine: 'edge', gender: 'male', id: 'en-US-RogerNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'English male.' },
  { locale: 'en', engine: 'edge', gender: 'male', id: 'en-US-SteffanNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'English male.' },
  { locale: 'en', engine: 'edge', gender: 'male', id: 'en-US-AndrewMultilingualNeural', shipping: false, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Near-duplicate of Andrew. Not a picker button.' },
  { locale: 'en', engine: 'edge', gender: 'male', id: 'en-US-BrianMultilingualNeural', shipping: false, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Near-duplicate of Brian. Not a picker button.' },
  { locale: 'en', engine: 'edge', gender: 'male', id: 'en-GB-RyanNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'British male.' },
  { locale: 'en', engine: 'edge', gender: 'male', id: 'en-HK-SamNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Hong Kong English male.' },
  { locale: 'en', engine: 'edge', gender: 'male', id: 'en-AU-WilliamMultilingualNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Australian male. Only William; not a twin of a US voice.' },
  { locale: 'en', engine: 'edge', gender: 'male', id: 'en-GB-ThomasNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'British male peer.' },
  { locale: 'en', engine: 'edge', gender: 'male', id: 'en-IE-ConnorNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Irish male.' },
  { locale: 'en', engine: 'edge', gender: 'male', id: 'en-IN-PrabhatNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Indian English male.' },
  { locale: 'en', engine: 'edge', gender: 'male', id: 'en-CA-LiamNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Canadian male.' },
  { locale: 'en', engine: 'edge', gender: 'male', id: 'en-NZ-MitchellNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'New Zealand male.' },
  { locale: 'en', engine: 'edge', gender: 'male', id: 'en-SG-WayneNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Singapore male.' },
  { locale: 'en', engine: 'edge', gender: 'male', id: 'en-ZA-LukeNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'South African male.' },
  { locale: 'en', engine: 'edge', gender: 'male', id: 'en-PH-JamesNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Philippine English male.' },
  { locale: 'en', engine: 'edge', gender: 'male', id: 'en-KE-ChilembaNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Kenyan male.' },
  { locale: 'en', engine: 'edge', gender: 'male', id: 'en-NG-AbeoNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Nigerian male.' },
  { locale: 'en', engine: 'edge', gender: 'male', id: 'en-TZ-ElimuNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Tanzanian male.' },
  { locale: 'en', engine: 'edge', gender: 'female', id: 'en-US-AriaNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'English female. Research default peer; Jenny stays the unwired fallback.' },
  { locale: 'en', engine: 'edge', gender: 'female', id: 'en-US-AvaNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'English female peer.' },
  { locale: 'en', engine: 'edge', gender: 'female', id: 'en-US-EmmaNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'English female peer.' },
  { locale: 'en', engine: 'edge', gender: 'female', id: 'en-US-MichelleNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'English female.' },
  { locale: 'en', engine: 'edge', gender: 'female', id: 'en-US-AnaNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'English female, cartoon/cute and often child-like. Listed for the bake-off.' },
  { locale: 'en', engine: 'edge', gender: 'female', id: 'en-US-AvaMultilingualNeural', shipping: false, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Near-duplicate of Ava. Not a picker button.' },
  { locale: 'en', engine: 'edge', gender: 'female', id: 'en-US-EmmaMultilingualNeural', shipping: false, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Near-duplicate of Emma. Not a picker button.' },
  { locale: 'en', engine: 'edge', gender: 'female', id: 'en-GB-SoniaNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'British female.' },
  { locale: 'en', engine: 'edge', gender: 'female', id: 'en-AU-NatashaNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Australian female.' },
  { locale: 'en', engine: 'edge', gender: 'female', id: 'en-GB-LibbyNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'British female peer.' },
  { locale: 'en', engine: 'edge', gender: 'female', id: 'en-IN-NeerjaNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Indian English female.' },
  { locale: 'en', engine: 'edge', gender: 'female', id: 'en-IE-EmilyNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Irish female.' },
  { locale: 'en', engine: 'edge', gender: 'female', id: 'en-NZ-MollyNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'New Zealand female.' },
  { locale: 'en', engine: 'edge', gender: 'female', id: 'en-HK-YanNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Hong Kong English female.' },
  { locale: 'en', engine: 'edge', gender: 'female', id: 'en-CA-ClaraNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Canadian female.' },
  { locale: 'en', engine: 'edge', gender: 'female', id: 'en-SG-LunaNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Singapore female.' },
  { locale: 'en', engine: 'edge', gender: 'female', id: 'en-ZA-LeahNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'South African female.' },
  { locale: 'en', engine: 'edge', gender: 'female', id: 'en-PH-RosaNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Philippine English female.' },
  { locale: 'en', engine: 'edge', gender: 'female', id: 'en-GB-MaisieNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'British female, child-like.' },
  { locale: 'en', engine: 'edge', gender: 'female', id: 'en-KE-AsiliaNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Kenyan female.' },
  { locale: 'en', engine: 'edge', gender: 'female', id: 'en-NG-EzinneNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Nigerian female.' },
  { locale: 'en', engine: 'edge', gender: 'female', id: 'en-TZ-ImaniNeural', shipping: true, license: 'Microsoft neural (read-aloud, no key)', latency: 'low', notes: 'Tanzanian female.' },
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
  { engine: 'cosyvoice', notes: 'Hold for a later GPU host. Not called.' },
  { engine: 'qwen3-tts', notes: 'Hold for a later GPU host. Not called.' },
  { engine: 'kokoro', notes: 'Catalog stub only. Weights are not bundled.' },
  { engine: 'melotts', notes: 'Catalog stub only. Weights are not bundled.' },
];

/** Locale → every retained option (shipping and later), in catalog order. */
export function voicesForLocale(locale: VoiceLocale): readonly VoiceOption[] {
  return VOICE_CATALOG.filter((v) => v.locale === locale);
}

/**
 * Bake-off buttons. One Edge Neural per row, labels fixed as
 * `{Language} {gender} {n}` within that language+gender group.
 * Near-duplicate multilingual twins of the same speaker are not buttons.
 */
export interface EdgeVoiceButton {
  locale: VoiceLocale;
  /** Group title. Also the first word of `label`. */
  language: 'Cantonese' | 'Mandarin' | 'Japanese' | 'English';
  gender: VoiceGender;
  /** 1-based index inside this language + gender. */
  n: number;
  /** Exact button text. */
  label: string;
  id: string;
  /** Soft note for cute / child-like voices. Not part of `label`. */
  note?: 'cute' | 'child-like';
}

const EDGE_SAMPLES: Record<VoiceLocale, string> = {
  yue: '你好呀，今日天氣幾好。我係你嘅語音助手。',
  zh: '你好，今天天气不错。我是你的语音助手。',
  ja: 'こんにちは。今日はいい天気ですね。私は音声アシスタントです。',
  en: "Hi there. Nice to meet you. I'm your voice companion.",
};

function edgeButton(
  locale: VoiceLocale,
  language: EdgeVoiceButton['language'],
  gender: VoiceGender,
  n: number,
  id: string,
  note?: EdgeVoiceButton['note'],
): EdgeVoiceButton {
  return { locale, language, gender, n, label: `${language} ${gender} ${n}`, id, note };
}

export const EDGE_VOICE_BUTTONS: readonly EdgeVoiceButton[] = [
  edgeButton('yue', 'Cantonese', 'male', 1, 'zh-HK-WanLungNeural'),
  edgeButton('yue', 'Cantonese', 'female', 1, 'zh-HK-HiuMaanNeural'),
  edgeButton('yue', 'Cantonese', 'female', 2, 'zh-HK-HiuGaaiNeural'),

  edgeButton('zh', 'Mandarin', 'male', 1, 'zh-CN-YunjianNeural'),
  edgeButton('zh', 'Mandarin', 'male', 2, 'zh-CN-YunxiNeural'),
  edgeButton('zh', 'Mandarin', 'male', 3, 'zh-CN-YunyangNeural'),
  edgeButton('zh', 'Mandarin', 'male', 4, 'zh-CN-YunxiaNeural', 'cute'),
  edgeButton('zh', 'Mandarin', 'male', 5, 'zh-TW-YunJheNeural'),
  edgeButton('zh', 'Mandarin', 'female', 1, 'zh-CN-XiaoxiaoNeural'),
  edgeButton('zh', 'Mandarin', 'female', 2, 'zh-CN-XiaoyiNeural'),
  edgeButton('zh', 'Mandarin', 'female', 3, 'zh-TW-HsiaoChenNeural'),
  edgeButton('zh', 'Mandarin', 'female', 4, 'zh-TW-HsiaoYuNeural'),
  edgeButton('zh', 'Mandarin', 'female', 5, 'zh-CN-liaoning-XiaobeiNeural'),
  edgeButton('zh', 'Mandarin', 'female', 6, 'zh-CN-shaanxi-XiaoniNeural'),

  edgeButton('ja', 'Japanese', 'male', 1, 'ja-JP-KeitaNeural'),
  edgeButton('ja', 'Japanese', 'female', 1, 'ja-JP-NanamiNeural'),

  edgeButton('en', 'English', 'male', 1, 'en-US-GuyNeural'),
  edgeButton('en', 'English', 'male', 2, 'en-US-AndrewNeural'),
  edgeButton('en', 'English', 'male', 3, 'en-US-BrianNeural'),
  edgeButton('en', 'English', 'male', 4, 'en-US-ChristopherNeural'),
  edgeButton('en', 'English', 'male', 5, 'en-US-EricNeural'),
  edgeButton('en', 'English', 'male', 6, 'en-US-RogerNeural'),
  edgeButton('en', 'English', 'male', 7, 'en-US-SteffanNeural'),
  edgeButton('en', 'English', 'male', 8, 'en-GB-RyanNeural'),
  edgeButton('en', 'English', 'male', 9, 'en-HK-SamNeural'),
  edgeButton('en', 'English', 'male', 10, 'en-AU-WilliamMultilingualNeural'),
  edgeButton('en', 'English', 'male', 11, 'en-GB-ThomasNeural'),
  edgeButton('en', 'English', 'male', 12, 'en-IE-ConnorNeural'),
  edgeButton('en', 'English', 'male', 13, 'en-IN-PrabhatNeural'),
  edgeButton('en', 'English', 'male', 14, 'en-CA-LiamNeural'),
  edgeButton('en', 'English', 'male', 15, 'en-NZ-MitchellNeural'),
  edgeButton('en', 'English', 'male', 16, 'en-SG-WayneNeural'),
  edgeButton('en', 'English', 'male', 17, 'en-ZA-LukeNeural'),
  edgeButton('en', 'English', 'male', 18, 'en-PH-JamesNeural'),
  edgeButton('en', 'English', 'male', 19, 'en-KE-ChilembaNeural'),
  edgeButton('en', 'English', 'male', 20, 'en-NG-AbeoNeural'),
  edgeButton('en', 'English', 'male', 21, 'en-TZ-ElimuNeural'),
  edgeButton('en', 'English', 'female', 1, 'en-US-AriaNeural'),
  edgeButton('en', 'English', 'female', 2, 'en-US-JennyNeural'),
  edgeButton('en', 'English', 'female', 3, 'en-US-AvaNeural'),
  edgeButton('en', 'English', 'female', 4, 'en-US-EmmaNeural'),
  edgeButton('en', 'English', 'female', 5, 'en-US-MichelleNeural'),
  edgeButton('en', 'English', 'female', 6, 'en-US-AnaNeural', 'child-like'),
  edgeButton('en', 'English', 'female', 7, 'en-GB-SoniaNeural'),
  edgeButton('en', 'English', 'female', 8, 'en-AU-NatashaNeural'),
  edgeButton('en', 'English', 'female', 9, 'en-GB-LibbyNeural'),
  edgeButton('en', 'English', 'female', 10, 'en-IN-NeerjaNeural'),
  edgeButton('en', 'English', 'female', 11, 'en-IE-EmilyNeural'),
  edgeButton('en', 'English', 'female', 12, 'en-NZ-MollyNeural'),
  edgeButton('en', 'English', 'female', 13, 'en-HK-YanNeural'),
  edgeButton('en', 'English', 'female', 14, 'en-CA-ClaraNeural'),
  edgeButton('en', 'English', 'female', 15, 'en-SG-LunaNeural'),
  edgeButton('en', 'English', 'female', 16, 'en-ZA-LeahNeural'),
  edgeButton('en', 'English', 'female', 17, 'en-PH-RosaNeural'),
  edgeButton('en', 'English', 'female', 18, 'en-GB-MaisieNeural', 'child-like'),
  edgeButton('en', 'English', 'female', 19, 'en-KE-AsiliaNeural'),
  edgeButton('en', 'English', 'female', 20, 'en-NG-EzinneNeural'),
  edgeButton('en', 'English', 'female', 21, 'en-TZ-ImaniNeural'),
];

export function edgeSampleText(locale: string): string {
  if (locale === 'yue' || locale === 'zh' || locale === 'ja' || locale === 'en') return EDGE_SAMPLES[locale];
  return EDGE_SAMPLES.en;
}

export function edgeVoiceButton(id: string): EdgeVoiceButton | undefined {
  return EDGE_VOICE_BUTTONS.find((b) => b.id === id);
}

export function isShippingEdgeVoice(id: string): boolean {
  return VOICE_CATALOG.some((v) => v.shipping && v.engine === 'edge' && v.id === id);
}

/** xml:lang for an Edge short name. Multilingual en-US voices stay en-US. */
export function ssmlLangForEdgeId(id: string): string {
  const parts = id.split('-');
  if (parts[0] === 'zh' && (parts[2] === 'liaoning' || parts[2] === 'shaanxi')) {
    return `${parts[0]}-${parts[1]}-${parts[2]}`;
  }
  return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : 'en-US';
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

/** BCP-47 prefixes for a companion language. No OS voice names. */
export function browserLangPrefixes(locale: string): readonly string[] {
  if (locale === 'yue') return ['zh-hk', 'yue'];
  if (locale === 'zh') return ['zh-cn', 'zh-hans', 'cmn'];
  if (locale === 'ja') return ['ja'];
  return ['en'];
}

/**
 * Runtime speechSynthesis fallback. Keeps voices whose lang tag matches the
 * companion language. Does not look at voice names.
 */
export function browserVoicesForLang<T extends { lang: string }>(voices: readonly T[], locale: string): T[] {
  const prefixes = browserLangPrefixes(locale);
  return voices.filter((voice) => {
    const tag = voice.lang.replace(/_/g, '-').toLowerCase();
    return prefixes.some((prefix) => tag === prefix || tag.startsWith(`${prefix}-`));
  });
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

const BROWSER_MALE = new Set([
  ...MALE_NAMES,
  'male', 'david', 'mark', 'george', 'daniel', 'alex', 'fred', 'rishi', 'aaron',
  'oliver', 'nathan', 'kangkang', 'otoya',
]);
const BROWSER_FEMALE = new Set([
  ...FEMALE_NAMES,
  'female', 'zira', 'samantha', 'hazel', 'susan', 'karen', 'victoria', 'allison',
  'fiona', 'moira', 'tessa', 'veena', 'serena', 'huihui', 'yaoyao', 'haruka',
  'sinji', 'kyoko',
]);

/** Tokens only. "America" must not count as Eric, and "Ryan" must not count as Yan. */
function voiceTokens(voiceName: string): string[] {
  const raw = voiceName.toLowerCase();
  const parts = raw.split(/[^a-z0-9]+/).filter((t) => t.length > 1);
  const glued = raw.split(/[^a-z0-9-]+/).map((chunk) => chunk.replace(/-/g, '')).filter((t) => t.length > 2);
  return [...parts, ...glued];
}

function mentions(voiceName: string, known: Set<string>): boolean {
  return voiceTokens(voiceName).some((token) => known.has(token));
}

/**
 * Gender heard in an OS voice name, or null when the name does not say.
 * "Female" is not male. "English (America)" is not Eric.
 */
export function browserVoiceGender(voiceName: string): VoiceGender | null {
  const lower = voiceName.toLowerCase();
  const femaleWord = lower.includes('female');
  const maleWord = /\bmale\b/.test(lower.replace(/female/g, ' '));
  if (femaleWord && !maleWord) return 'female';
  if (maleWord && !femaleWord) return 'male';
  const female = mentions(voiceName, BROWSER_FEMALE);
  const male = mentions(voiceName, BROWSER_MALE);
  if (female && !male) return 'female';
  if (male && !female) return 'male';
  return null;
}

/**
 * Substring match that does not treat a Female voice as Male.
 * `Male` is only the gender token, not the letters inside "female".
 */
export function voiceNameMatches(voiceName: string, needle: string): boolean {
  const name = voiceName.toLowerCase();
  const n = needle.toLowerCase();
  if (n === 'male') return browserVoiceGender(voiceName) === 'male';
  if (n === 'female') return browserVoiceGender(voiceName) === 'female';
  if (/^[a-z0-9-]+$/i.test(needle)) {
    const want = n.replace(/-/g, '');
    return voiceTokens(voiceName).includes(n) || voiceTokens(voiceName).includes(want);
  }
  return name.includes(n);
}

/** Browser voices whose names read as the opposite gender (Windows David has no "Male" in the name). */
export function synthNameConflicts(gender: VoiceGender, voiceName: string): boolean {
  const heard = browserVoiceGender(voiceName);
  return heard !== null && heard !== gender;
}
